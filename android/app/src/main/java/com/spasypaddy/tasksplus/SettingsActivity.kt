package com.spasypaddy.tasksplus

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SettingsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { AppTheme { SettingsScreen() } }
    }
}

@Composable
private fun SettingsScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var url by remember { mutableStateOf(Prefs.url(context) ?: "") }
    var token by remember { mutableStateOf(Prefs.token(context) ?: "") }
    var status by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
        Column(
            Modifier.safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Tasks Plus", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Connects the home screen widget to Tasks Plus on your Home Assistant.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            OutlinedTextField(
                value = url,
                onValueChange = { url = it },
                label = { Text("Home Assistant address") },
                placeholder = { Text("https://xxxx.ui.nabu.casa") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                "Use the same address as the Home Assistant app: Settings > Companion app > your server.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            OutlinedTextField(
                value = token,
                onValueChange = { token = it },
                label = { Text("Long-lived access token") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                "In Home Assistant, open your profile, choose Security, then Create token under Long-lived access tokens. Copy it here.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(
                enabled = !busy && url.isNotBlank() && token.isNotBlank(),
                onClick = {
                    busy = true
                    status = null
                    scope.launch {
                        val t = token.trim()
                        status = try {
                            val u = Api.normalize(url)
                            url = u
                            val body = withContext(Dispatchers.IO) { Api(u, t).list() }
                            Prefs.saveConnection(context, u, t)
                            Prefs.saveCache(context, body, synced = true)
                            Sync.push(context, body, null)
                            Sync.schedule(context)
                            val open = Model.parse(body).count { !it.done }
                            "Connected. $open ${if (open == 1) "task" else "tasks"} to do.\n\nAdd the widget: long-press your home screen, choose Widgets, then Tasks Plus."
                        } catch (e: Exception) {
                            Api.friendly(e)
                        }
                        busy = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (busy) "Checking…" else "Save and connect") }
            status?.let { Text(it, style = MaterialTheme.typography.bodyLarge) }
        }
    }
}
