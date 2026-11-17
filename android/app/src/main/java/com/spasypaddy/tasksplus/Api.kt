package com.spasypaddy.tasksplus

import android.content.Context
import org.json.JSONObject
import java.io.IOException
import java.net.ConnectException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.net.URLEncoder
import java.net.UnknownHostException
import javax.net.ssl.SSLException

class ApiException(val code: Int, message: String) : IOException(message)

/** Talks to Tasks Plus on Home Assistant. Every call blocks: run it off the main thread. */
class Api(baseUrl: String, private val token: String) {
    private val base = normalize(baseUrl)

    /** Fetches the list, and checks the answer really is the list. */
    fun list(): String {
        val text = call("/api/tasks_plus/tasks", "GET", null)
        val ok = try { JSONObject(text).optJSONArray("tasks") != null } catch (e: Exception) { false }
        if (!ok) throw ApiException(0, "That address answered, but not with your tasks. Use just the start of the address, like https://xxxx.ui.nabu.casa")
        return text
    }

    fun add(fields: JSONObject): String = call("/api/tasks_plus/tasks", "POST", fields)

    fun update(taskId: String, changes: JSONObject): String =
        call("/api/tasks_plus/tasks/" + URLEncoder.encode(taskId, "UTF-8"), "POST", JSONObject().put("changes", changes))

    private fun call(path: String, method: String, body: JSONObject?): String {
        val conn = URL(base + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 10_000
            conn.readTimeout = 15_000
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("Accept", "application/json")
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (code !in 200..299) throw ApiException(code, errorMessage(code, text))
            return text
        } finally {
            conn.disconnect()
        }
    }

    private fun errorMessage(code: Int, text: String): String = when (code) {
        401, 403 -> "Home Assistant didn't accept the token. Open Tasks Plus and check it."
        404 -> "Tasks Plus wasn't found. Update the integration in HACS to 1.1.0 or later."
        else -> try { JSONObject(text).optString("message").ifEmpty { "Home Assistant returned error $code." } }
        catch (e: Exception) { "Home Assistant returned error $code." }
    }

    companion object {
        /**
         * Keeps only the server part of an address, so a link copied from the
         * browser (https://host/lovelace/0, https://host/tasks-plus) still works.
         */
        fun normalize(input: String): String {
            var s = input.trim()
            if (!s.contains("://")) s = "https://$s"
            val u = URL(s)
            if (u.host.isNullOrEmpty()) throw java.net.MalformedURLException("no host")
            val port = if (u.port == -1) "" else ":${u.port}"
            return "${u.protocol}://${u.host}$port"
        }

        fun from(context: Context): Api? {
            val url = Prefs.url(context)
            val token = Prefs.token(context)
            if (url.isNullOrBlank() || token.isNullOrBlank()) return null
            return try { Api(url, token) } catch (e: Exception) { null }
        }

        fun friendly(e: Throwable): String = when (e) {
            is ApiException -> e.message ?: "Something went wrong."
            is UnknownHostException, is ConnectException, is SocketTimeoutException ->
                "Can't reach Home Assistant. Check your connection."
            is SSLException -> "Secure connection to Home Assistant failed. Check the address."
            is IllegalArgumentException, is java.net.MalformedURLException ->
                "That address doesn't look right. Use the full address, starting https://"
            else -> e.message ?: "Something went wrong."
        }
    }
}
