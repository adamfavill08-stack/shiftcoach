package com.shiftcoach.app

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByDurationRequest
import androidx.health.connect.client.request.ReadRecordsRequest
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
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit
import org.json.JSONArray
import org.json.JSONObject

/**
 * Background Health Connect → POST /api/health-connect/sync.
 * Mirrors [ShiftCoachHealthConnectPlugin.syncNow] ranges: steps (15m buckets when permitted),
 * sleep sessions (14d when permitted), heart-rate samples (14d when permitted).
 */
class HealthConnectSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    companion object {
        private const val TAG = "ShiftCoachHCSleep"
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
            Log.i(TAG, "worker skip: no access token in native prefs")
            return Result.success()
        }

        val sdkStatus = HealthConnectClient.getSdkStatus(applicationContext, "com.google.android.apps.healthdata")
        if (sdkStatus != HealthConnectClient.SDK_AVAILABLE) {
            Log.i(TAG, "worker retry: Health Connect SDK not AVAILABLE ($sdkStatus)")
            return Result.retry()
        }
        Log.i(TAG, "worker: Health Connect available=true")

        val client = try {
            HealthConnectClient.getOrCreate(applicationContext, "com.google.android.apps.healthdata")
        } catch (e: Throwable) {
            Log.w(TAG, "worker retry: getOrCreate failed", e)
            return Result.retry()
        }

        val granted = try {
            client.permissionController.getGrantedPermissions()
        } catch (e: Throwable) {
            Log.w(TAG, "worker retry: getGrantedPermissions failed", e)
            return Result.retry()
        }

        val stepsPerm = HealthPermission.getReadPermission(StepsRecord::class)
        val sleepPerm = HealthPermission.getReadPermission(SleepSessionRecord::class)
        val hrPerm = HealthPermission.getReadPermission(HeartRateRecord::class)
        val hasSteps = granted.contains(stepsPerm)
        val hasSleep = granted.contains(sleepPerm)
        val hasHr = granted.contains(hrPerm)
        Log.i(
            TAG,
            "worker permissions: steps=$hasSteps sleep=$hasSleep heartRate=$hasHr " +
                "(sleep read perm id=$sleepPerm)",
        )
        if (!hasSteps && !hasSleep && !hasHr) {
            Log.i(TAG, "worker skip: no steps, sleep, or HR read permission")
            return Result.success()
        }

        val now = Instant.now()
        val zone = ZoneId.systemDefault()
        val todayLocal = ZonedDateTime.now(zone).toLocalDate()
        val todayYmd = todayLocal.toString()

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
        if (hasSteps) {
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
                Log.w(TAG, "worker: step aggregate failed", e)
                return Result.retry()
            }
        }

        val sleepArr: JSONArray
        var sleepTotalMinutes = 0L
        if (hasSleep) {
            try {
                val sleepFrom = now.minus(14, ChronoUnit.DAYS)
                val read = HealthConnectSleepJson.readSleepSessions(client, sleepFrom, now, "worker")
                sleepArr = read.first
                sleepTotalMinutes = read.second
            } catch (e: Throwable) {
                Log.e(TAG, "worker: sleep readRecords failed", e)
                return Result.retry()
            }
        } else {
            sleepArr = JSONArray()
        }

        val hrArr = JSONArray()
        if (hasHr) {
            try {
                val hrFrom = now.minus(14, ChronoUnit.DAYS)
                val req =
                    ReadRecordsRequest(
                        HeartRateRecord::class,
                        TimeRangeFilter.between(hrFrom, now),
                    )
                val resp = client.readRecords(req)
                val maxHr = 5000
                var n = 0
                outer@ for (rec in resp.records) {
                    for (sample in rec.samples) {
                        if (n >= maxHr) break@outer
                        val o = JSONObject()
                        o.put("bpm", sample.beatsPerMinute.toInt())
                        o.put("ts", sample.time.toString())
                        hrArr.put(o)
                        n++
                    }
                }
            } catch (e: Throwable) {
                Log.w(TAG, "worker: heart rate read failed (non-fatal)", e)
            }
        }

        val body = JSONObject()
        body.put("steps", 0)
        body.put("dailySteps", JSONArray())
        body.put("stepSamples", stepSamples)
        body.put("sleep", sleepArr)
        body.put("heartRate", hrArr)
        body.put("syncedAt", now.toString())
        body.put("activityDate", todayYmd)
        body.put("loggedAt", now.toString())

        val origin = prefs.getString(KEY_SYNC_ORIGIN, null)?.trim()?.trimEnd('/')?.ifEmpty { null } ?: DEFAULT_SYNC_API_ORIGIN
        val endpoint = "$origin/api/health-connect/sync"

        val code = try {
            val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 30_000
                readTimeout = 120_000
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
            Log.e(TAG, "worker: POST failed", e)
            return Result.retry()
        }

        if (code !in 200..299) {
            Log.w(TAG, "worker: sync HTTP $code")
            return Result.retry()
        }
        prefs.edit().putString(KEY_LAST_SYNC_AT, now.toString()).apply()
        Log.i(
            TAG,
            "worker sync ok: sleepSessions=${sleepArr.length()} sleepTotalMin=$sleepTotalMinutes " +
                "stepSamples=${stepSamples.length()} hrSamples=${hrArr.length()}",
        )
        return Result.success()
    }
}
