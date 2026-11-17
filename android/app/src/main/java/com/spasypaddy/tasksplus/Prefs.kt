package com.spasypaddy.tasksplus

import android.content.Context

/** Connection details and the last list we fetched, kept in this app's private storage. */
object Prefs {
    private fun sp(c: Context) = c.applicationContext.getSharedPreferences("tasksplus", Context.MODE_PRIVATE)

    fun url(c: Context): String? = sp(c).getString("url", null)
    fun token(c: Context): String? = sp(c).getString("token", null)
    fun cache(c: Context): String? = sp(c).getString("cache", null)
    fun lastSync(c: Context): Long = sp(c).getLong("synced", 0L)

    fun saveConnection(c: Context, url: String, token: String) {
        sp(c).edit().putString("url", url).putString("token", token).apply()
    }

    fun saveCache(c: Context, json: String, synced: Boolean) {
        val e = sp(c).edit().putString("cache", json)
        if (synced) e.putLong("synced", System.currentTimeMillis())
        e.apply()
    }
}
