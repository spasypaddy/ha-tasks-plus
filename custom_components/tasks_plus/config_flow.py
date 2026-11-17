"""Set up Tasks Plus from Settings > Devices & services."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN


class TasksPlusConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            name = (user_input.get("name") or "").strip() or "Tasks"
            return self.async_create_entry(title=name, data={})
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({vol.Optional("name", default="Tasks"): str}),
        )
