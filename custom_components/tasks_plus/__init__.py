"""Tasks Plus: a to-do list with subtasks, notes, due dates and priorities."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

import voluptuous as vol

from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType

from .const import (
    DOMAIN,
    FRONTEND_FILE,
    PANEL_ELEMENT,
    PANEL_ICON,
    PANEL_URL_PATH,
    STATIC_URL,
    STORAGE_KEY,
    STORAGE_VERSION,
)
from .http_api import TaskItemView, TasksListView
from .model import TaskError, TaskList

PLATFORMS = [Platform.TODO]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

_FRONTEND_DIR = Path(__file__).parent / "frontend"
_STATIC_REGISTERED = f"{DOMAIN}_static_registered"
_WS_REGISTERED = f"{DOMAIN}_ws_registered"


class TasksManager:
    """Loads, saves and shares the task list."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._listeners: set[Callable[[], None]] = set()
        self.list = TaskList(on_change=self._changed)

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self.list = TaskList(data.get("tasks", []), on_change=self._changed)

    async def async_flush(self) -> None:
        await self._store.async_save(self._data_to_save())

    def _data_to_save(self) -> dict[str, Any]:
        return {"tasks": self.list.tasks}

    @callback
    def _changed(self) -> None:
        self._store.async_delay_save(self._data_to_save, 1)
        for listener in list(self._listeners):
            listener()

    @callback
    def async_add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        self._listeners.add(listener)

        @callback
        def remove() -> None:
            self._listeners.discard(listener)

        return remove


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the parts that live for the whole run: files and API."""
    if not hass.data.get(_STATIC_REGISTERED):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(_FRONTEND_DIR), False)]
        )
        hass.data[_STATIC_REGISTERED] = True
    if not hass.data.get(_WS_REGISTERED):
        for handler in (ws_subscribe, ws_add, ws_update, ws_delete, ws_import):
            websocket_api.async_register_command(hass, handler)
        hass.http.register_view(TasksListView())
        hass.http.register_view(TaskItemView())
        hass.data[_WS_REGISTERED] = True
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    manager = TasksManager(hass)
    await manager.async_load()
    hass.data[DOMAIN] = manager
    entry.runtime_data = manager

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    version = _frontend_version()
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=entry.title,
        sidebar_icon=PANEL_ICON,
        module_url=f"{STATIC_URL}/{FRONTEND_FILE}?v={version}",
        require_admin=False,
        config={"title": entry.title},
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        manager: TasksManager = entry.runtime_data
        await manager.async_flush()
        hass.data.pop(DOMAIN, None)
    return unloaded


def _frontend_version() -> str:
    """Change the panel's URL whenever its file changes, so browsers and the
    phone app load the new version instead of a cached old one."""
    try:
        return str(int((_FRONTEND_DIR / FRONTEND_FILE).stat().st_mtime))
    except OSError:
        return "0"


# ---------------------------------------------------------------- websocket API


def _manager(hass: HomeAssistant, connection: websocket_api.ActiveConnection,
             msg: dict[str, Any]) -> TasksManager | None:
    manager = hass.data.get(DOMAIN)
    if manager is None:
        connection.send_error(msg["id"], "not_loaded", "Tasks Plus isn't set up yet.")
    return manager


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection,
                 msg: dict[str, Any]) -> None:
    """Send the whole list now and again after every change."""
    manager = _manager(hass, connection, msg)
    if manager is None:
        return

    @callback
    def forward() -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], {"tasks": manager.list.tasks})
        )

    connection.subscriptions[msg["id"]] = manager.async_add_listener(forward)
    connection.send_result(msg["id"])
    forward()


def _apply(hass, connection, msg, action: Callable[[TasksManager], Any]) -> None:
    manager = _manager(hass, connection, msg)
    if manager is None:
        return
    try:
        result = action(manager)
    except TaskError as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/add",
        vol.Required("text"): str,
        vol.Optional("due"): vol.Any(str, None),
        vol.Optional("priority"): vol.Any(str, None),
        vol.Optional("notes"): vol.Any(str, None),
        vol.Optional("subtasks"): list,
    }
)
@callback
def ws_add(hass, connection, msg) -> None:
    data = {k: v for k, v in msg.items() if k not in ("id", "type")}
    _apply(hass, connection, msg, lambda m: {"task": m.list.add(data)})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/update",
        vol.Required("task_id"): str,
        vol.Required("changes"): dict,
    }
)
@callback
def ws_update(hass, connection, msg) -> None:
    _apply(hass, connection, msg,
           lambda m: {"task": m.list.update(msg["task_id"], msg["changes"])})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/delete",
        vol.Required("task_ids"): [str],
    }
)
@callback
def ws_delete(hass, connection, msg) -> None:
    _apply(hass, connection, msg, lambda m: {"removed": m.list.delete(msg["task_ids"])})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/import",
        vol.Required("tasks"): list,
    }
)
@callback
def ws_import(hass, connection, msg) -> None:
    _apply(hass, connection, msg, lambda m: {"imported": m.list.import_tasks(msg["tasks"])})
