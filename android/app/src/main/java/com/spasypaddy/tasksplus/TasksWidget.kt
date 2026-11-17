package com.spasypaddy.tasksplus

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.Action
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.CheckBox
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.defaultWeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

private val HIGH = ColorProvider(Color(0xFFE53935))
private val MEDIUM = ColorProvider(Color(0xFFFB8C00))
private val LOW = ColorProvider(Color(0xFF43A047))
private val NONE = ColorProvider(Color(0x00000000))

private fun priorityColor(p: String) = when (p) {
    "high" -> HIGH
    "medium" -> MEDIUM
    "low" -> LOW
    else -> NONE
}

val TaskIdKey = ActionParameters.Key<String>("task")
val SubIdKey = ActionParameters.Key<String>("sub")

/** Opens the full Tasks page in the Home Assistant app. */
private fun openPanel(): Action = actionStartActivity(
    Intent(Intent.ACTION_VIEW, Uri.parse("homeassistant://navigate/tasks-plus"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
)

class TasksWidget : GlanceAppWidget() {
    override val stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        coroutineScope {
            launch { Sync.refreshIfStale(context) }
            provideContent {
                GlanceTheme {
                    val state = currentState<Preferences>()
                    WidgetContent(
                        json = state[Sync.KEY_JSON] ?: Prefs.cache(context),
                        error = state[Sync.KEY_ERROR],
                    )
                }
            }
        }
    }
}

class TasksWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TasksWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Sync.schedule(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Sync.cancel(context)
    }
}

@Composable
private fun WidgetContent(json: String?, error: String?) {
    val all = Model.parse(json)
    val open = all.filter { !it.done }.sortedWith(Model.order)
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .appWidgetBackground()
            .cornerRadius(android.R.dimen.system_app_widget_background_radius)
            .background(GlanceTheme.colors.widgetBackground)
            .padding(start = 14.dp, end = 10.dp, top = 12.dp, bottom = 4.dp)
    ) {
        Header(if (json == null && error == null) "Loading…" else Model.summary(all))
        if (error != null) {
            Text(
                text = error,
                maxLines = 2,
                style = TextStyle(color = GlanceTheme.colors.error, fontSize = 12.sp),
                modifier = GlanceModifier.fillMaxWidth().padding(top = 2.dp, bottom = 4.dp)
                    .clickable(actionStartActivity<SettingsActivity>()),
            )
        }
        Spacer(GlanceModifier.height(6.dp))
        if (open.isEmpty()) {
            Box(GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = if (json == null) "" else "All done!",
                    style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant, fontSize = 15.sp),
                )
            }
        } else {
            LazyColumn(GlanceModifier.fillMaxSize()) {
                items(open, itemId = { it.id.hashCode().toLong() }) { task -> TaskItem(task) }
            }
        }
    }
}

@Composable
private fun Header(summary: String) {
    Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(GlanceModifier.defaultWeight().clickable(openPanel())) {
            Text(
                text = "Tasks",
                style = TextStyle(color = GlanceTheme.colors.onSurface, fontSize = 20.sp, fontWeight = FontWeight.Bold),
            )
            Text(
                text = summary,
                style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant, fontSize = 12.sp),
            )
        }
        Image(
            provider = ImageProvider(R.drawable.ic_refresh),
            contentDescription = "Refresh",
            colorFilter = ColorFilter.tint(GlanceTheme.colors.onSurfaceVariant),
            modifier = GlanceModifier.size(40.dp).padding(9.dp).cornerRadius(20.dp)
                .clickable(actionRunCallback<RefreshAction>()),
        )
        Spacer(GlanceModifier.width(4.dp))
        Box(
            modifier = GlanceModifier.size(44.dp).cornerRadius(14.dp)
                .background(GlanceTheme.colors.primaryContainer)
                .clickable(actionStartActivity<AddTaskActivity>()),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                provider = ImageProvider(R.drawable.ic_add),
                contentDescription = "Add task",
                colorFilter = ColorFilter.tint(GlanceTheme.colors.onPrimaryContainer),
                modifier = GlanceModifier.size(24.dp),
            )
        }
    }
}

@Composable
private fun TaskItem(task: Task) {
    val openSubs = task.subtasks.filter { !it.done }
    Column(GlanceModifier.fillMaxWidth().padding(bottom = 4.dp)) {
        Row(GlanceModifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(GlanceModifier.width(4.dp).height(40.dp).cornerRadius(2.dp).background(priorityColor(task.priority))) {}
            Spacer(GlanceModifier.width(4.dp))
            CheckBox(
                checked = false,
                onCheckedChange = actionRunCallback<TickAction>(actionParametersOf(TaskIdKey to task.id)),
            )
            Column(GlanceModifier.defaultWeight().padding(start = 2.dp).clickable(openPanel())) {
                Text(
                    text = task.text,
                    maxLines = 2,
                    style = TextStyle(color = GlanceTheme.colors.onSurface, fontSize = 15.sp, fontWeight = FontWeight.Medium),
                )
                MetaLine(task)
            }
        }
        for (sub in openSubs) {
            Row(GlanceModifier.fillMaxWidth().padding(start = 26.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(GlanceModifier.width(3.dp).height(22.dp).cornerRadius(2.dp).background(priorityColor(sub.priority))) {}
                CheckBox(
                    checked = false,
                    onCheckedChange = actionRunCallback<TickAction>(
                        actionParametersOf(TaskIdKey to task.id, SubIdKey to sub.id)
                    ),
                )
                Text(
                    text = sub.text,
                    maxLines = 1,
                    style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant, fontSize = 13.sp),
                    modifier = GlanceModifier.defaultWeight(),
                )
            }
        }
    }
}

@Composable
private fun MetaLine(task: Task) {
    val due = Model.dueLabel(task.due)
    val subsDone = task.subtasks.count { it.done }
    val steps = if (task.subtasks.isNotEmpty()) "$subsDone of ${task.subtasks.size} steps" else null
    if (due == null && steps == null) return
    Row(verticalAlignment = Alignment.CenterVertically) {
        if (due != null) {
            val color = when (due.second) {
                DueKind.OVERDUE -> GlanceTheme.colors.error
                DueKind.SOON -> GlanceTheme.colors.primary
                DueKind.LATER -> GlanceTheme.colors.onSurfaceVariant
            }
            Text(text = due.first, style = TextStyle(color = color, fontSize = 12.sp, fontWeight = FontWeight.Medium))
        }
        if (due != null && steps != null) Spacer(GlanceModifier.width(8.dp))
        if (steps != null) {
            Text(text = steps, style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant, fontSize = 12.sp))
        }
    }
}

class RefreshAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        Sync.refresh(context)
    }
}

/**
 * Ticks off a task (and with it all its subtasks) or a single subtask.
 * The widget updates at once; if Home Assistant can't be reached, it goes back
 * to how it was and says why.
 */
class TickAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val taskId = parameters[TaskIdKey] ?: return
        val subId = parameters[SubIdKey]
        val api = Api.from(context) ?: return Sync.refresh(context)
        val before = Prefs.cache(context) ?: return

        val root = JSONObject(before)
        val tasks = root.optJSONArray("tasks") ?: return
        val task = (0 until tasks.length()).map { tasks.getJSONObject(it) }.firstOrNull { it.optString("id") == taskId }
            ?: return Sync.refresh(context)
        val subs = task.optJSONArray("subtasks")
        val changes = JSONObject()
        if (subId == null) {
            task.put("done", true)
            if (subs != null) for (i in 0 until subs.length()) subs.getJSONObject(i).put("done", true)
            changes.put("done", true)
        } else {
            if (subs == null) return
            for (i in 0 until subs.length()) {
                val s = subs.getJSONObject(i)
                if (s.optString("id") == subId) s.put("done", true)
            }
            changes.put("subtasks", subs)
        }
        val after = root.toString()
        Prefs.saveCache(context, after, synced = false)
        Sync.push(context, after, null)

        try {
            withContext(Dispatchers.IO) { api.update(taskId, changes) }
            Sync.refresh(context)
        } catch (e: Exception) {
            Prefs.saveCache(context, before, synced = false)
            Sync.push(context, before, Api.friendly(e))
        }
    }
}
