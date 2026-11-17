"""The task list itself: plain Python, no Home Assistant imports.

A task is a dict:
    id        str   unique id
    text      str   the task name
    done      bool
    created   int   milliseconds since the epoch
    due       str   "YYYY-MM-DD", or "" for no date
    priority  str   "high" | "medium" | "low" | "" for none
    notes     str
    subtasks  list of {id, text, done, priority}
"""

from __future__ import annotations

import datetime as dt
import re
import secrets
import time
from typing import Any, Callable

from .const import (
    MAX_NOTES,
    MAX_SUBTASKS,
    MAX_TASKS,
    MAX_TEXT,
    PRIORITIES,
    PRIORITY_RANK,
)

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

EDITABLE_FIELDS = ("text", "done", "due", "priority", "notes", "subtasks")


class TaskError(ValueError):
    """Raised when a request can't be applied (bad input or unknown task)."""


def new_id() -> str:
    return secrets.token_hex(8)


def now_ms() -> int:
    return int(time.time() * 1000)


def _clean_text(value: Any, field: str = "text") -> str:
    if not isinstance(value, str):
        raise TaskError(f"{field} must be text")
    text = value.strip()
    if not text:
        raise TaskError(f"{field} can't be empty")
    return text[:MAX_TEXT]


def _clean_due(value: Any) -> str:
    if value in (None, ""):
        return ""
    if isinstance(value, dt.datetime):
        return value.date().isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    if isinstance(value, str) and _DATE_RE.match(value):
        try:
            dt.date.fromisoformat(value)
        except ValueError as err:
            raise TaskError("due must be a real date") from err
        return value
    raise TaskError("due must be a date in YYYY-MM-DD form")


def _clean_priority(value: Any) -> str:
    if value in (None, ""):
        return ""
    if value not in PRIORITIES:
        raise TaskError("priority must be high, medium, low or empty")
    return value


def _clean_notes(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise TaskError("notes must be text")
    return value.strip()[:MAX_NOTES]


def _clean_subtasks(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise TaskError("subtasks must be a list")
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in value[:MAX_SUBTASKS]:
        if not isinstance(raw, dict):
            raise TaskError("each subtask must be an object")
        sid = raw.get("id")
        if not isinstance(sid, str) or not sid or sid in seen:
            sid = new_id()
        seen.add(sid)
        out.append(
            {
                "id": sid,
                "text": _clean_text(raw.get("text"), "subtask text"),
                "done": bool(raw.get("done", False)),
                "priority": _clean_priority(raw.get("priority")),
            }
        )
    return out


def normalize_task(raw: dict[str, Any], *, keep_id: bool = True) -> dict[str, Any]:
    """Return a clean, complete task built from possibly partial input."""
    if not isinstance(raw, dict):
        raise TaskError("a task must be an object")
    tid = raw.get("id") if keep_id else None
    created = raw.get("created")
    return {
        "id": tid if isinstance(tid, str) and tid else new_id(),
        "text": _clean_text(raw.get("text")),
        "done": bool(raw.get("done", False)),
        "created": int(created) if isinstance(created, (int, float)) else now_ms(),
        "due": _clean_due(raw.get("due")),
        "priority": _clean_priority(raw.get("priority")),
        "notes": _clean_notes(raw.get("notes")),
        "subtasks": _clean_subtasks(raw.get("subtasks")),
    }


def sort_key(task: dict[str, Any]) -> tuple:
    """Unfinished first, then priority (high to low, none last), then soonest
    due date (undated last), then when added. Matches the panel's order."""
    due = task.get("due") or ""
    return (
        bool(task.get("done")),
        PRIORITY_RANK.get(task.get("priority") or "", 3),
        0 if due else 1,
        due,
        task.get("created", 0),
    )


class TaskList:
    """In-memory task list. Every change calls `on_change`."""

    def __init__(self, tasks: list[dict[str, Any]] | None = None,
                 on_change: Callable[[], None] | None = None) -> None:
        self._tasks: list[dict[str, Any]] = []
        self._on_change = on_change or (lambda: None)
        for raw in tasks or []:
            try:
                self._tasks.append(normalize_task(raw))
            except TaskError:
                continue  # skip anything unreadable rather than fail to load

    @property
    def tasks(self) -> list[dict[str, Any]]:
        return self._tasks

    def sorted(self) -> list[dict[str, Any]]:
        return sorted(self._tasks, key=sort_key)

    def get(self, task_id: str) -> dict[str, Any]:
        for task in self._tasks:
            if task["id"] == task_id:
                return task
        raise TaskError("that task no longer exists")

    def add(self, data: dict[str, Any]) -> dict[str, Any]:
        if len(self._tasks) >= MAX_TASKS:
            raise TaskError("the list is full; clear some completed tasks first")
        task = normalize_task(
            {**data, "id": None, "created": now_ms(), "done": False}, keep_id=False
        )
        self._tasks.append(task)
        self._on_change()
        return task

    def update(self, task_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        task = self.get(task_id)
        unknown = set(changes) - set(EDITABLE_FIELDS)
        if unknown:
            raise TaskError(f"can't change {', '.join(sorted(unknown))}")
        updated = dict(task)
        if "text" in changes:
            updated["text"] = _clean_text(changes["text"])
        if "due" in changes:
            updated["due"] = _clean_due(changes["due"])
        if "priority" in changes:
            updated["priority"] = _clean_priority(changes["priority"])
        if "notes" in changes:
            updated["notes"] = _clean_notes(changes["notes"])
        if "subtasks" in changes:
            updated["subtasks"] = _clean_subtasks(changes["subtasks"])
        if "done" in changes:
            updated["done"] = bool(changes["done"])
            # Completing a task also ticks off all of its subtasks
            if updated["done"] and not task["done"]:
                updated["subtasks"] = [
                    {**s, "done": True} for s in updated["subtasks"]
                ]
        if updated == task:
            return task
        task.clear()
        task.update(updated)
        self._on_change()
        return task

    def delete(self, task_ids: list[str]) -> int:
        ids = set(task_ids)
        before = len(self._tasks)
        self._tasks = [t for t in self._tasks if t["id"] not in ids]
        removed = before - len(self._tasks)
        if removed:
            self._on_change()
        return removed

    def import_tasks(self, raws: list[dict[str, Any]]) -> int:
        """Add tasks from another list, keeping their done state, dates and
        subtasks. Each gets a fresh id so nothing collides."""
        if not isinstance(raws, list):
            raise TaskError("import must be a list of tasks")
        new = []
        for raw in raws:
            task = normalize_task(raw, keep_id=False)
            new.append(task)
        if len(self._tasks) + len(new) > MAX_TASKS:
            raise TaskError("that would make the list too long")
        if new:
            self._tasks.extend(new)
            self._on_change()
        return len(new)
