package com.spasypaddy.tasksplus

import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

data class Sub(val id: String, val text: String, val done: Boolean, val priority: String)

data class Task(
    val id: String,
    val text: String,
    val done: Boolean,
    val created: Long,
    val due: String,
    val priority: String,
    val notes: String,
    val subtasks: List<Sub>,
)

enum class DueKind { OVERDUE, SOON, LATER }

object Model {
    fun rank(priority: String): Int = when (priority) {
        "high" -> 0
        "medium" -> 1
        "low" -> 2
        else -> 3
    }

    /** Same order as the Home Assistant panel: priority, then soonest date, then when added. */
    val order: Comparator<Task> = compareBy<Task>(
        { it.done },
        { rank(it.priority) },
        { if (it.due.isEmpty()) 1 else 0 },
        { it.due },
        { it.created },
    )

    /** Reads the API's {"tasks": [...]} response. Bad or missing data gives an empty list. */
    fun parse(json: String?): List<Task> {
        if (json.isNullOrBlank()) return emptyList()
        return try {
            val arr = JSONObject(json).optJSONArray("tasks") ?: return emptyList()
            (0 until arr.length()).mapNotNull { i -> arr.optJSONObject(i)?.let(::task) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun task(o: JSONObject): Task? {
        val id = o.optString("id")
        val text = o.optString("text")
        if (id.isEmpty() || text.isEmpty()) return null
        val subsJson = o.optJSONArray("subtasks") ?: JSONArray()
        val subs = (0 until subsJson.length()).mapNotNull { i ->
            subsJson.optJSONObject(i)?.let {
                Sub(it.optString("id"), it.optString("text"), it.optBoolean("done"), it.optString("priority"))
            }
        }.sortedBy { rank(it.priority) } // stable: same priority keeps its order
        return Task(
            id = id,
            text = text,
            done = o.optBoolean("done"),
            created = o.optLong("created"),
            due = o.optString("due"),
            priority = o.optString("priority"),
            notes = o.optString("notes"),
            subtasks = subs,
        )
    }

    fun dueLabel(due: String, today: LocalDate = LocalDate.now()): Pair<String, DueKind>? {
        if (due.isEmpty()) return null
        val date = try { LocalDate.parse(due) } catch (e: Exception) { return null }
        val days = ChronoUnit.DAYS.between(today, date)
        val locale = Locale.getDefault()
        val pretty = if (date.year == today.year) {
            date.format(DateTimeFormatter.ofPattern("EEE d MMM", locale))
        } else {
            date.format(DateTimeFormatter.ofPattern("d MMM yyyy", locale))
        }
        return when {
            days < 0 -> "Overdue · $pretty" to DueKind.OVERDUE
            days == 0L -> "Due today" to DueKind.SOON
            days == 1L -> "Due tomorrow" to DueKind.SOON
            days < 7 -> "Due " + date.dayOfWeek.getDisplayName(TextStyle.FULL, locale) to DueKind.LATER
            else -> "Due $pretty" to DueKind.LATER
        }
    }

    fun summary(tasks: List<Task>, today: LocalDate = LocalDate.now()): String {
        val open = tasks.filter { !it.done }
        if (tasks.isEmpty()) return "Nothing yet"
        if (open.isEmpty()) return "All done"
        val overdue = open.count { t -> dueLabel(t.due, today)?.second == DueKind.OVERDUE }
        return "${open.size} to do" + if (overdue > 0) " · $overdue overdue" else ""
    }
}
