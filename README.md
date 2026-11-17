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

## Dashboard card

The same list can go on any dashboard. Edit a dashboard, choose **Add card**, and search for **Tasks Plus**. Or add it in YAML:

```yaml
type: custom:tasks-plus-card
title: Tasks   # optional; leave it out or set it to "" for no heading
```

The card loads automatically with the integration; there's no resource to add.

## On your phone and Mac

- **Android:** open **Tasks** from the sidebar in the Home Assistant app. For the home screen, long-press an empty space, choose **Widgets**, find Home Assistant's **To-do** widget, and pick the **Tasks** list.
- **Mac:** open **Tasks** in a browser or in the Home Assistant Mac app.

The widget is Home Assistant's own, so it shows task names and tick boxes. Subtasks, priorities and notes are on the **Tasks** page. Ticking a task in the widget keeps its priority, date and subtasks.

## Android widget app

Home Assistant's own to-do widget only shows names and tick boxes. The **Tasks Plus** Android app adds a widget that looks like the list itself: priority colours, due dates, step counts, and tick boxes for tasks and subtasks. Its **+** button adds a task.

1. On your phone, download `tasks-plus.apk` from the [latest release](https://github.com/spasypaddy/ha-tasks-plus/releases/latest) and open it. Android will ask you to allow installs from your browser the first time.
2. Open **Tasks Plus**. Enter your Home Assistant address (the same one the Home Assistant app uses) and a long-lived access token (in Home Assistant: your profile > **Security** > **Long-lived access tokens** > **Create token**). Tap **Save and connect**.
3. Long-press your home screen, choose **Widgets**, and add **Tasks Plus**.

The widget refreshes every 15 minutes, when you tap the refresh button, and straight after you tick something. Tapping a task opens the full **Tasks** page in the Home Assistant app. Needs Android 12 or later and Tasks Plus 1.1.0 or later.

## Moving tasks from another list

On the **Tasks** page, choose **Import tasks** at the bottom and paste a JSON list of tasks. Each task can have `text`, `done`, `due` (`YYYY-MM-DD`), `priority` (`high`, `medium`, `low`), `notes` and `subtasks` (each with `text`, `done`, `priority`). Imported tasks are added; nothing is replaced.

## For automations

The list is the entity `todo.tasks` (or `todo.<your name>` if you renamed it). Use the standard `todo.add_item`, `todo.update_item`, `todo.remove_item` and `todo.get_items` actions. Due dates and notes are supported.

## Licence

MIT
