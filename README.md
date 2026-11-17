# Tasks Plus

A to-do list for Home Assistant with subtasks, notes, due dates and red / orange / green priorities. It adds a **Tasks** page to the sidebar and a normal Home Assistant to-do list, so the Android app's to-do widget, voice commands and automations work with it too.

Everything is saved on your Home Assistant. Nothing is sent anywhere else.

## Features

- Tasks with **subtasks**. Ticking a task off ticks all its subtasks.
- **Notes** on each task.
- **Due dates** with "Due today", "Due tomorrow" and "Overdue" labels.
- **Priorities**: High (red), Medium (orange), Low (green), on tasks and subtasks.
- Tap any task or subtask name to edit it.
- **To-Do / Done / All** tabs. The list opens on To-Do.
- Sorted by priority, then due date.
- Follows your Home Assistant theme, light and dark.
- Live: a change on your phone shows straight away on your Mac.

## Install

1. In Home Assistant, open **HACS**.
2. Open the three-dot menu, choose **Custom repositories**, and add `https://github.com/spasypaddy/ha-tasks-plus` with type **Integration**.
3. Find **Tasks Plus** in HACS and choose **Download**.
4. Restart Home Assistant.
5. Go to **Settings > Devices & services > Add integration**, search for **Tasks Plus**, and add it.

**Tasks** now appears in the sidebar.

## On your phone and Mac

- **Android:** open **Tasks** from the sidebar in the Home Assistant app. For the home screen, long-press an empty space, choose **Widgets**, find Home Assistant's **To-do** widget, and pick the **Tasks** list.
- **Mac:** open **Tasks** in a browser or in the Home Assistant Mac app.

The widget is Home Assistant's own, so it shows task names and tick boxes. Subtasks, priorities and notes are on the **Tasks** page. Ticking a task in the widget keeps its priority, date and subtasks.

## Moving tasks from another list

On the **Tasks** page, choose **Import tasks** at the bottom and paste a JSON list of tasks. Each task can have `text`, `done`, `due` (`YYYY-MM-DD`), `priority` (`high`, `medium`, `low`), `notes` and `subtasks` (each with `text`, `done`, `priority`). Imported tasks are added; nothing is replaced.

## For automations

The list is the entity `todo.tasks` (or `todo.<your name>` if you renamed it). Use the standard `todo.add_item`, `todo.update_item`, `todo.remove_item` and `todo.get_items` actions. Due dates and notes are supported.

## Licence

MIT
