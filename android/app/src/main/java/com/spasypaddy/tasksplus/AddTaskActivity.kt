package com.spasypaddy.tasksplus

import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.background
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.time.LocalDate

/** The quick "add a task" sheet opened by the widget's + button. */
class AddTaskActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AppTheme {
                Dialog(onDismissRequest = { finish() }) {
                    AddTaskCard(onClose = { finish() }, onConnect = {
                        startActivity(Intent(this, SettingsActivity::class.java))
                        finish()
                    })
                }
            }
        }
    }
}

@Composable
private fun AddTaskCard(onClose: () -> Unit, onConnect: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val api = remember { Api.from(context) }
    var text by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf("") }
    var due by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val focus = remember { FocusRequester() }

    fun save() {
        val name = text.trim()
        if (name.isEmpty() || api == null || busy) return
        busy = true
        error = null
        scope.launch {
            try {
                val fields = JSONObject().put("text", name).put("priority", priority).put("due", due)
                withContext(Dispatchers.IO) { api.add(fields) }
                Sync.refresh(context)
                onClose()
            } catch (e: Exception) {
                error = Api.friendly(e)
                busy = false
            }
        }
    }

    Surface(shape = RoundedCornerShape(28.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("New task", style = MaterialTheme.typography.headlineSmall)
            if (api == null) {
                Text("Connect the app to Home Assistant first.", style = MaterialTheme.typography.bodyLarge)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onClose) { Text("Cancel") }
                    TextButton(onClick = onConnect) { Text("Connect") }
                }
            } else {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                placeholder = { Text("e.g. Book dentist appointment") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Sentences,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(onDone = { save() }),
                modifier = Modifier.fillMaxWidth().focusRequester(focus),
            )
            LaunchedEffect(Unit) { focus.requestFocus() }

            Text("Priority", style = MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for ((key, label) in listOf("high" to "High", "medium" to "Medium", "low" to "Low")) {
                    FilterChip(
                        selected = priority == key,
                        onClick = { priority = if (priority == key) "" else key },
                        label = { Text(label) },
                        leadingIcon = {
                            Box(Modifier.size(10.dp).background(PriorityColors.getValue(key), CircleShape))
                        },
                    )
                }
            }

            Text("Due", style = MaterialTheme.typography.labelLarge)
            val today = LocalDate.now()
            val presets = listOf(today.toString() to "Today", today.plusDays(1).toString() to "Tomorrow")
            val custom = due.isNotEmpty() && presets.none { it.first == due }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for ((value, label) in presets) {
                    FilterChip(
                        selected = due == value,
                        onClick = { due = if (due == value) "" else value },
                        label = { Text(label) },
                    )
                }
                FilterChip(
                    selected = custom,
                    onClick = {
                        val start = if (due.isNotEmpty()) LocalDate.parse(due) else today
                        DatePickerDialog(context, { _, y, m, d ->
                            due = LocalDate.of(y, m + 1, d).toString()
                        }, start.year, start.monthValue - 1, start.dayOfMonth).show()
                    },
                    label = { Text(if (custom) Model.dueLabel(due)?.first?.removePrefix("Due ") ?: due else "Pick date") },
                )
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onClose) { Text("Cancel") }
                TextButton(onClick = { save() }, enabled = text.isNotBlank() && !busy) {
                    Text(if (busy) "Adding…" else "Add")
                }
            }
            }
        }
    }
}
