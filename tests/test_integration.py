"""End-to-end tests against a real Home Assistant core."""

from __future__ import annotations

import pytest

from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

DOMAIN = "tasks_plus"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    yield


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, title="Tasks")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _result(client, msg_id: int) -> dict:
    """Read messages until the result for msg_id arrives (events may come first)."""
    while True:
        msg = await client.receive_json()
        if msg["id"] == msg_id and msg["type"] == "result":
            return msg


async def test_config_flow_single_instance(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"name": "Tasks"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Tasks"
    await hass.async_block_till_done()
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is FlowResultType.ABORT


async def test_panel_api_and_todo_entity(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await _setup(hass)
    assert "tasks-plus" in hass.data["frontend_panels"]

    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": f"{DOMAIN}/subscribe"})
    assert (await client.receive_json())["success"]
    first = await client.receive_json()
    assert first["event"]["tasks"] == []

    # Add from the panel, with a date and priority
    await client.send_json({"id": 2, "type": f"{DOMAIN}/add", "text": "Book dentist",
                            "due": "2026-11-20", "priority": "high"})
    res = await _result(client, 2)
    assert res["success"], res
    task_id = res["result"]["task"]["id"]

    # Add subtasks, then complete the task: subtasks get ticked too
    await client.send_json({"id": 3, "type": f"{DOMAIN}/update", "task_id": task_id,
                            "changes": {"subtasks": [{"text": "Find number"}, {"text": "Call"}]}})
    assert (await _result(client, 3))["success"]

    state = hass.states.get("todo.tasks")
    assert state is not None and state.state == "1"

    # Tick it off the way the Android widget does: through the to-do entity
    await hass.services.async_call("todo", "update_item",
                                   {"item": "Book dentist", "status": "completed"},
                                   target={"entity_id": "todo.tasks"}, blocking=True)
    task = hass.data[DOMAIN].list.get(task_id)
    assert task["done"] is True
    assert all(s["done"] for s in task["subtasks"])
    assert task["priority"] == "high", "the widget doesn't wipe priority"
    assert task["due"] == "2026-11-20"
    assert hass.states.get("todo.tasks").state == "0"

    # Add through the to-do entity (voice, automations), with a date and notes
    await hass.services.async_call("todo", "add_item",
                                   {"item": "Buy card", "due_date": "2026-12-01", "description": "For Mum"},
                                   target={"entity_id": "todo.tasks"}, blocking=True)
    items = await hass.services.async_call("todo", "get_items", {},
                                           target={"entity_id": "todo.tasks"},
                                           blocking=True, return_response=True)
    summaries = {i["summary"]: i for i in items["todo.tasks"]["items"]}
    assert summaries["Buy card"]["due"] == "2026-12-01"
    assert summaries["Buy card"]["description"] == "For Mum"

    # Bad input is refused with a clear error, not stored
    await client.send_json({"id": 4, "type": f"{DOMAIN}/update", "task_id": task_id,
                            "changes": {"priority": "urgent"}})
    bad = await _result(client, 4)
    assert not bad["success"] and bad["error"]["code"] == "invalid"

    # Import from the old list
    await client.send_json({"id": 5, "type": f"{DOMAIN}/import", "tasks": [
        {"text": "Old task", "done": False, "priority": "low", "created": 1,
         "subtasks": [{"id": "x", "text": "step", "done": True}]}]})
    imp = await _result(client, 5)
    assert imp["success"] and imp["result"]["imported"] == 1

    # Delete
    await client.send_json({"id": 6, "type": f"{DOMAIN}/delete", "task_ids": [task_id]})
    assert (await _result(client, 6))["result"]["removed"] == 1
    assert len(hass.data[DOMAIN].list.tasks) == 2

    # Survives an unload and reload (saved to storage)
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert "tasks-plus" not in hass.data["frontend_panels"]
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    texts = sorted(t["text"] for t in hass.data[DOMAIN].list.tasks)
    assert texts == ["Buy card", "Old task"]
