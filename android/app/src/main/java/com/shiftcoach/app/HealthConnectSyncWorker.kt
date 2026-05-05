package com.shiftcoach.app

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByDurationRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

class HealthConnectSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    companion object {
        private const val PREFS = "shiftcoach_hc_native"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_LAST_SYNC_AT = "last_successful_sync_at"
        private const val KEY_SYNC_ORIGIN = "sync_origin"
        private const val DEFAULT_SYNC_API_ORIGIN = "https://www.shiftcoach.app"
    }

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val accessToken = prefs.getString(KEY_ACCESS_TOKEN, null)?.trim().orEmpty()
        if (accessToken.isEmpty()) {
            return Result.success()
        }

        val sdkStatus = HealthConnectClient.getSdkStatus(applicationContext, "com.google.android.apps.healthdata")
        if (sdkStatus != HealthConnectClient.SDK_AVAILABLE) {
            return Result.retry()
        }

        val client = try {
            HealthConnectClient.getOrCreate(applicationContext, "com.google.android.apps.healthdata")
        } catch (e: Throwable) {
            return Result.retry()
        }

        val granted = try {
            client.permissionController.getGrantedPermissions()
        } catch (e: Throwable) {
            return Result.retry()
        }
        if (!granted.contains(HealthPermission.getReadPermission(StepsRecord::class))) {
            return Result.success()
        }

        val now = Instant.now()
        val lastSyncInstant =
            prefs.getString(KEY_LAST_SYNC_AT, null)
                ?.let {
                    try {
                        Instant.parse(it)
                    } catch (_: Throwable) {
                        null
                    }
                }
        val fetchFrom =
            (lastSyncInstant ?: now.minus(Duration.ofHours(24)))
                .minus(Duration.ofHours(2))
        if (!fetchFrom.isBefore(now)) return Result.success()

        val stepSamples = JSONArray()
        try {
            val grouped =
                client.aggregateGroupByDuration(
                    AggregateGroupByDurationRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(fetchFrom, now),
                        timeRangeSlicer = Duration.ofMinutes(15),
                    ),
                )
            for (bucket in grouped) {
                val steps = (bucket.result[StepsRecord.COUNT_TOTAL] ?: 0L).coerceAtLeast(0L)
                val o = JSONObject()
                o.put("timestamp", bucket.startTime.toString())
                o.put("endTimestamp", bucket.endTime.toString())
                o.put("steps", steps.coerceAtMost(Int.MAX_VALUE.toLong()).toInt())
                stepSamples.put(o)
            }
        } catch (e: Throwable) {
            return Result.retry()
        }

        val body = JSONObject()
        body.put("steps", 0)
        body.put("stepSamples", stepSamples)
        body.put("syncedAt", now.toString())
        body.put("activityDate", now.toString().slice(0..9))

        val origin = prefs.getString(KEY_SYNC_ORIGIN, null)?.trim()?.trimEnd('/')?.ifEmpty { null } ?: DEFAULT_SYNC_API_ORIGIN
        val endpoint = "$origin/api/health-connect/sync"

        val code = try {
            val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 30_000
                readTimeout = 60_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Authorization", "Bearer $accessToken")
            }
            conn.outputStream.use { os ->
                os.write(body.toString().toByteArray(StandardCharsets.UTF_8))
            }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else (conn.errorStream ?: conn.inputStream)
            BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { it.readText() }
            conn.disconnect()
            status
        } catch (e: Throwable) {
            return Result.retry()
        }

        if (code !in 200..299) return Result.retry()
        prefs.edit().putString(KEY_LAST_SYNC_AT, now.toString()).apply()
        return Result.success()
    }
}
