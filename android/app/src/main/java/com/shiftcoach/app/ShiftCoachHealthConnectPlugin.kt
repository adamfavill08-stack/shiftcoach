package com.shiftcoach.app

import android.net.Uri
import android.webkit.CookieManager
import androidx.activity.result.ActivityResultLauncher
import androidx.fragment.app.FragmentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectSdkStatus
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject

/**
 * Phone-side Health Connect → POST /api/health-connect/sync (session cookies from WebView).
 * [StepsRecord] aggregation includes all sources the user allowed in Health Connect (watch, phone, apps).
 */
@CapacitorPlugin(name = "ShiftCoachHealthConnect")
class ShiftCoachHealthConnectPlugin : Plugin() {

    private val requiredPermissions: Set<HealthPermission> =
        setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
        )

    private var permissionLauncher: ActivityResultLauncher<Set<HealthPermission>>? = null
    private val pendingPermissionCall = AtomicReference<PluginCall?>(null)

    override fun load() {
        super.load()
        val act = activity as? FragmentActivity ?: return
        permissionLauncher =
            act.registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
                granted ->
                val call = pendingPermissionCall.getAndSet(null) ?: return@registerForActivityResult
                val hasAll = requiredPermissions.all { p -> granted.contains(p) }
                val ret = JSObject()
                ret.put("granted", hasAll)
                call.resolve(ret)
            }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        bridge.execute {
            try {
                val ctx = context
                val sdk = HealthConnectClient.getSdkStatus(ctx)
                val ret = JSObject()
                ret.put("sdkStatus", sdk.name)
                val available = sdk == HealthConnectSdkStatus.SDK_AVAILABLE
                ret.put("available", available)
                if (!available) {
                    ret.put("hasPermissions", false)
                    call.resolve(ret)
                    return@execute
                }
                val client = HealthConnectClient.getOrCreate(ctx)
                val granted =
                    runBlocking { client.permissionController.getGrantedPermissions() }
                ret.put("hasPermissions", requiredPermissions.all { it in granted })
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("health_connect_status_failed", e.message, e)
            }
        }
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        val launcher = permissionLauncher
        if (launcher == null) {
            call.reject("health_connect_ui_unavailable", "Activity does not support permission flow", null)
            return
        }
        if (!pendingPermissionCall.compareAndSet(null, call)) {
            call.reject("health_connect_busy", "Another permission request is in progress", null)
            return
        }
        launcher.launch(requiredPermissions)
    }

    @PluginMethod
    fun syncNow(call: PluginCall) {
        bridge.execute {
            try {
                val ctx = context
                if (HealthConnectClient.getSdkStatus(ctx) != HealthConnectSdkStatus.SDK_AVAILABLE) {
                    call.reject("health_connect_unavailable", "Health Connect is not available on this device", null)
                    return@execute
                }
                val client = HealthConnectClient.getOrCreate(ctx)
                val granted =
                    runBlocking { client.permissionController.getGrantedPermissions() }
                if (!requiredPermissions.all { it in granted }) {
                    val err = JSObject()
                    err.put("needsPermissions", true)
                    call.reject("health_connect_permissions", "Grant Health Connect permissions first", err)
                    return@execute
                }

                val zone = ZoneId.systemDefault()
                val now = Instant.now()
                val startOfDay =
                    ZonedDateTime.now(zone).toLocalDate().atStartOfDay(zone).toInstant()

                val stepsTotal =
                    runBlocking {
                        val req =
                            ReadRecordsRequest(
                                StepsRecord::class,
                                TimeRangeFilter.between(startOfDay, now),
                            )
                        val resp = client.readRecords(req)
                        resp.records.sumOf { it.count.toLong() }
                    }

                val sleepArr = JSONArray()
                runBlocking {
                    val from = now.minus(14, ChronoUnit.DAYS)
                    val req =
                        ReadRecordsRequest(
                            SleepSessionRecord::class,
                            TimeRangeFilter.between(from, now),
                        )
                    val resp = client.readRecords(req)
                    for (session in resp.records) {
                        val o = JSONObject()
                        o.put("start", session.startTime.toString())
                        o.put("end", session.endTime.toString())
                        session.metadata.id?.let { o.put("sampleId", it.toString()) }
                        sleepArr.put(o)
                    }
                }

                val hrArr = JSONArray()
                var hrCount = 0
                val maxHr = 2500
                runBlocking {
                    val from = now.minus(2, ChronoUnit.DAYS)
                    val req =
                        ReadRecordsRequest(
                            HeartRateRecord::class,
                            TimeRangeFilter.between(from, now),
                        )
                    val resp = client.readRecords(req)
                    outer@ for (rec in resp.records) {
                        for (sample in rec.samples) {
                            if (hrCount >= maxHr) break@outer
                            val o = JSONObject()
                            o.put("bpm", sample.beatsPerMinute.toInt())
                            o.put("ts", sample.time.toString())
                            hrArr.put(o)
                            hrCount++
                        }
                    }
                }

                val syncedAt = Instant.now().toString()
                val body = JSONObject()
                val stepsInt = stepsTotal.coerceIn(0L, Int.MAX_VALUE.toLong()).toInt()
                body.put("steps", stepsInt)
                body.put("activityDate", ZonedDateTime.now(zone).toLocalDate().toString())
                body.put("sleep", sleepArr)
                body.put("heartRate", hrArr)
                body.put("syncedAt", syncedAt)

                val origin = webOrigin() ?: run {
                    call.reject("health_connect_no_origin", "Could not read app URL for API call", null)
                    return@execute
                }

                val cookie = CookieManager.getInstance().getCookie(origin) ?: ""
                val url = URL(origin.trimEnd('/') + "/api/health-connect/sync")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 30_000
                conn.readTimeout = 60_000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.setRequestProperty("Accept", "application/json")
                if (cookie.isNotEmpty()) {
                    conn.setRequestProperty("Cookie", cookie)
                }
                conn.outputStream.use { os ->
                    os.write(body.toString().toByteArray(StandardCharsets.UTF_8))
                }
                val code = conn.responseCode
                val stream =
                    if (code in 200..299) conn.inputStream else conn.errorStream ?: conn.inputStream
                val text =
                    BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { it.readText() }
                conn.disconnect()

                if (code !in 200..299) {
                    call.reject(
                        "health_connect_http_$code",
                        "Sync failed: HTTP $code ${text.take(200)}",
                        null,
                    )
                    return@execute
                }

                val ret = JSObject()
                ret.put("ok", true)
                ret.put("lastSyncedAt", syncedAt)
                ret.put("steps", stepsTotal.coerceIn(0L, Int.MAX_VALUE.toLong()).toInt())
                ret.put("sleepCount", sleepArr.length())
                ret.put("heartRateCount", hrArr.length())
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("health_connect_sync_failed", e.message, e)
            }
        }
    }

    private fun webOrigin(): String? {
        val wv = bridge?.webView ?: return null
        val url = wv.url ?: return null
        return try {
            val u = Uri.parse(url)
            val scheme = u.scheme ?: return null
            val host = u.host ?: return null
            val port = u.port
            if (port != -1 && port != 80 && port != 443) {
                "$scheme://$host:$port"
            } else {
                "$scheme://$host"
            }
        } catch (_: Exception) {
            null
        }
    }
}
