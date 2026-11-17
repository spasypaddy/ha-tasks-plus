package com.spasypaddy.tasksplus

import android.content.Context
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

object Sync {
    val KEY_JSON = stringPreferencesKey("json")
    val KEY_ERROR = stringPreferencesKey("error")
    val KEY_STAMP = longPreferencesKey("stamp")

    private const val PERIODIC = "tasksplus-refresh"

    /** Fetch the list from Home Assistant and redraw every widget. */
    suspend fun refresh(context: Context) {
        val api = Api.from(context)
        if (api == null) {
            push(context, Prefs.cache(context), "Tap to connect to Home Assistant")
            return
        }
        try {
            val body = withContext(Dispatchers.IO) { api.list() }
            Prefs.saveCache(context, body, synced = true)
            push(context, body, null)
        } catch (e: Exception) {
            push(context, Prefs.cache(context), Api.friendly(e))
        }
    }

    suspend fun refreshIfStale(context: Context, maxAgeMs: Long = 60_000) {
        if (System.currentTimeMillis() - Prefs.lastSync(context) > maxAgeMs) refresh(context)
    }

    /** Hand new data to every placed widget; Glance redraws them. */
    suspend fun push(context: Context, json: String?, error: String?) {
        val manager = GlanceAppWidgetManager(context)
        for (id in manager.getGlanceIds(TasksWidget::class.java)) {
            updateAppWidgetState(context, id) { p ->
                if (json != null) p[KEY_JSON] = json else p.remove(KEY_JSON)
                if (error != null) p[KEY_ERROR] = error else p.remove(KEY_ERROR)
                p[KEY_STAMP] = System.currentTimeMillis()
            }
            TasksWidget().update(context, id)
        }
    }

    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<RefreshWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(PERIODIC)
    }
}

class RefreshWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        Sync.refresh(applicationContext)
        return Result.success()
    }
}
