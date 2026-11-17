"""Plain HTTP API for apps outside the Home Assistant frontend (the Android widget).

Uses Home Assistant's normal authentication: send a long-lived access token
as `Authorization: Bearer <token>`.

    GET  /api/tasks_plus/tasks               -> {"tasks": [...]}
    POST /api/tasks_plus/tasks               {"text", "due"?, "priority"?, "notes"?}  -> {"task": {...}}
    POST /api/tasks_plus/tasks/{task_id}     {"changes": {...}}                       -> {"task": {...}}
"""

from __future__ import annotations

from http import HTTPStatus
from typing import Any

from aiohttp import web

from homeassistant.components.http import HomeAssistantView

from .const import DOMAIN
from .model import TaskError

API_VERSION = 1


def _manager(request: web.Request):
    return request.app["hass"].data.get(DOMAIN)


def _not_ready(view: HomeAssistantView) -> web.Response:
    return view.json_message("Tasks Plus isn't set up yet.", HTTPStatus.SERVICE_UNAVAILABLE)


async def _body(request: web.Request) -> dict[str, Any] | None:
    try:
        data = await request.json()
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


class TasksListView(HomeAssistantView):
    url = "/api/tasks_plus/tasks"
    name = "api:tasks_plus:tasks"

    async def get(self, request: web.Request) -> web.Response:
        manager = _manager(request)
        if manager is None:
            return _not_ready(self)
        return self.json({"api": API_VERSION, "tasks": manager.list.tasks})

    async def post(self, request: web.Request) -> web.Response:
        manager = _manager(request)
        if manager is None:
            return _not_ready(self)
        data = await _body(request)
        if data is None:
            return self.json_message("Send a JSON object.", HTTPStatus.BAD_REQUEST)
        fields = {k: data[k] for k in ("text", "due", "priority", "notes", "subtasks") if k in data}
        try:
            task = manager.list.add(fields)
        except TaskError as err:
            return self.json_message(str(err), HTTPStatus.BAD_REQUEST)
        return self.json({"task": task})


class TaskItemView(HomeAssistantView):
    url = "/api/tasks_plus/tasks/{task_id}"
    name = "api:tasks_plus:task"

    async def post(self, request: web.Request, task_id: str) -> web.Response:
        manager = _manager(request)
        if manager is None:
            return _not_ready(self)
        data = await _body(request)
        if data is None or not isinstance(data.get("changes"), dict):
            return self.json_message('Send {"changes": {...}}.', HTTPStatus.BAD_REQUEST)
        try:
            task = manager.list.update(task_id, data["changes"])
        except TaskError as err:
            return self.json_message(str(err), HTTPStatus.BAD_REQUEST)
        return self.json({"task": task})
