"""Shows the tasks as a Home Assistant to-do list.

This is what the Android app's to-do widget, voice commands and automations
use. It carries each task's name, done state, due date and notes; subtasks
and priorities live in the Tasks Plus panel.
"""

from __future__ import annotations

import datetime as dt

from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .model import TaskError


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry,
                            async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([TasksPlusTodoList(entry)])


def _to_item(task: dict) -> TodoItem:
    due = None
    if task.get("due"):
        try:
            due = dt.date.fromisoformat(task["due"])
        except ValueError:
            due = None
    return TodoItem(
        summary=task["text"],
        uid=task["id"],
        status=TodoItemStatus.COMPLETED if task["done"] else TodoItemStatus.NEEDS_ACTION,
        due=due,
        description=task.get("notes") or None,
    )


class TasksPlusTodoList(TodoListEntity):
    _attr_has_entity_name = False
    _attr_should_poll = False
    _attr_icon = "mdi:checkbox-marked-circle-outline"
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.SET_DUE_DATE_ON_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
    )

    def __init__(self, entry: ConfigEntry) -> None:
        self._entry = entry
        self._attr_name = entry.title
        self._attr_unique_id = f"{entry.entry_id}_tasks"

    @property
    def _list(self):
        return self._entry.runtime_data.list

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            self._entry.runtime_data.async_add_listener(self.async_write_ha_state)
        )

    @property
    def todo_items(self) -> list[TodoItem]:
        return [_to_item(t) for t in self._list.sorted()]

    async def async_create_todo_item(self, item: TodoItem) -> None:
        try:
            self._list.add({
                "text": item.summary or "",
                "due": item.due,
                "notes": item.description,
            })
        except TaskError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_update_todo_item(self, item: TodoItem) -> None:
        changes: dict = {
            "done": item.status == TodoItemStatus.COMPLETED,
            "due": item.due,
            "notes": item.description,
        }
        if item.summary:
            changes["text"] = item.summary
        try:
            self._list.update(item.uid, changes)
        except TaskError as err:
            raise HomeAssistantError(str(err)) from err

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        self._list.delete(uids)
