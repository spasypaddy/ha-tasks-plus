package com.spasypaddy.tasksplus

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

val PriorityColors = mapOf(
    "high" to Color(0xFFE53935),
    "medium" to Color(0xFFFB8C00),
    "low" to Color(0xFF43A047),
)

/** Uses the phone's own Material You colours, light or dark. */
@Composable
fun AppTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val scheme = if (isSystemInDarkTheme()) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    MaterialTheme(colorScheme = scheme, content = content)
}
