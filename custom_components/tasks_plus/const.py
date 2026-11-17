"""Constants for Tasks Plus."""

DOMAIN = "tasks_plus"

STORAGE_KEY = f"{DOMAIN}.tasks"
STORAGE_VERSION = 1

PANEL_URL_PATH = "tasks-plus"
PANEL_ELEMENT = "tasks-plus-panel"
PANEL_ICON = "mdi:checkbox-marked-circle-outline"
STATIC_URL = "/tasks_plus_static"
FRONTEND_FILE = "tasks-plus-panel.js"

PRIORITIES = ("high", "medium", "low")
PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}

MAX_TEXT = 200
MAX_NOTES = 5000
MAX_TASKS = 2000
MAX_SUBTASKS = 100
