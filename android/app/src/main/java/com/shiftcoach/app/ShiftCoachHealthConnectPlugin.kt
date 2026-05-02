package com.shiftcoach.app

import android.net.Uri
import android.content.Context
import android.content.Intent
import android.health.connect.HealthConnectManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.os.ext.SdkExtensions
import android.webkit.CookieManager
import androidx.activity.result.ActivityResultLauncher
import androidx.fragment.app.FragmentActivity
import androidx.health.connect.client.HealthConnectClient
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

    init {
        android.util.Log.i("ShiftCoachHC", "ShiftCoachHealthConnectPlugin constructor / class load OK (${javaClass.name})")
    }

    /** Google Health Connect provider (see Health Connect Jetpack docs). */
    private val healthConnectProviderPackage = "com.google.android.apps.healthdata"

    private val requiredPermissions: Set<String> =
        setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
        )

    private var permissionLauncher: ActivityResultLauncher<Set<String>>? = null
    private val pendingPermissionCall = AtomicReference<PluginCall?>(null)

    /**
     * Health Connect provider resolution differs across Android releases.
     * Prefer SDK-default methods when present (Android 14+), and fall back to
     * explicit provider package methods for older/provider-app devices.
     */
    private fun resolveSdkStatus(ctx: Context): Int {
        return try {
            val oneArg =
                HealthConnectClient::class.java.methods.firstOrNull { m ->
                    m.name == "getSdkStatus" &&
                        m.parameterTypes.size == 1 &&
                        m.parameterTypes[0] == Context::class.java
                }
            if (oneArg != null) {
                val s =
                    (oneArg.invoke(null, ctx) as? Int)
                        ?: HealthConnectClient.getSdkStatus(ctx, healthConnectProviderPackage)
                android.util.Log.d("ShiftCoachHC", "resolveSdkStatus: used single-arg getSdkStatus → ${sdkStatusLabel(s)}")
                s
            } else {
                val s = HealthConnectClient.getSdkStatus(ctx, healthConnectProviderPackage)
                android.util.Log.d("ShiftCoachHC", "resolveSdkStatus: no single-arg API; provider getSdkStatus → ${sdkStatusLabel(s)}")
                s
            }
        } catch (t: Throwable) {
            android.util.Log.w("ShiftCoachHC", "resolveSdkStatus: exception, falling back to provider package", t)
            try {
                HealthConnectClient.getSdkStatus(ctx, healthConnectProviderPackage)
            } catch (t2: Throwable) {
                android.util.Log.e("ShiftCoachHC", "resolveSdkStatus: fallback failed", t2)
                HealthConnectClient.SDK_UNAVAILABLE
            }
        }
    }

    private fun createHealthConnectClient(ctx: Context): HealthConnectClient {
        return try {
            val oneArg =
                HealthConnectClient::class.java.methods.firstOrNull { m ->
                    m.name == "getOrCreate" &&
                        m.parameterTypes.size == 1 &&
                        m.parameterTypes[0] == Context::class.java
                }
            if (oneArg != null) {
                (oneArg.invoke(null, ctx) as? HealthConnectClient)
                    ?: HealthConnectClient.getOrCreate(ctx, healthConnectProviderPackage)
            } else {
                HealthConnectClient.getOrCreate(ctx, healthConnectProviderPackage)
            }
        } catch (_: Throwable) {
            HealthConnectClient.getOrCreate(ctx, healthConnectProviderPackage)
        }
    }

    private fun resolveDefaultProviderPackageName(): String {
        return try {
            val field = HealthConnectClient::class.java.getDeclaredField("DEFAULT_PROVIDER_PACKAGE_NAME")
            field.isAccessible = true
            (field.get(null) as? String)?.takeIf { it.isNotBlank() } ?: healthConnectProviderPackage
        } catch (_: Throwable) {
            healthConnectProviderPackage
        }
    }

    /**
     * Must run on the main thread — [FragmentActivity.registerForActivityResult] requirement.
     */
    private fun registerPermissionLauncherIfNeeded(): Boolean {
        if (permissionLauncher != null) {
            android.util.Log.d("ShiftCoachHC", "registerPermissionLauncherIfNeeded: already registered")
            return true
        }
        val rawAct = activity
        android.util.Log.i(
            "ShiftCoachHC",
            "registerPermissionLauncherIfNeeded: activityClass=${rawAct?.javaClass?.name} " +
                "isFragmentActivity=${rawAct is FragmentActivity} mainLooper=${Looper.myLooper() == Looper.getMainLooper()}",
        )
        val act = rawAct as? FragmentActivity
        if (act == null) {
            android.util.Log.e(
                "ShiftCoachHC",
                "registerPermissionLauncherIfNeeded: FAIL — activity is " +
                    (if (rawAct == null) "null" else rawAct.javaClass.name) +
                    " (need FragmentActivity for ActivityResultRegistryOwner)",
            )
            return false
        }
        return try {
            permissionLauncher =
                act.registerForActivityResult(
                    PermissionController.createRequestPermissionResultContract(),
                ) { activityResultGranted ->
                    deliverPermissionActivityResult(activityResultGranted)
                }
            android.util.Log.i("ShiftCoachHC", "requestPermissionLauncher registerForActivityResult SUCCESS")
            true
        } catch (e: Exception) {
            android.util.Log.e("ShiftCoachHC", "requestPermissionLauncher registerForActivityResult FAILED", e)
            false
        }
    }

    /** Health Connect permission dialog result — always re-query granted set from the platform. */
    private fun deliverPermissionActivityResult(activityResultGranted: Set<String>) {
        android.util.Log.i(
            "ShiftCoachHC",
            "ActivityResult callback fired contractGrantedSize=${activityResultGranted.size} " +
                activityResultGranted.joinToString(prefix = "[", postfix = "]"),
        )
        val call = pendingPermissionCall.getAndSet(null)
        if (call == null) {
            android.util.Log.w("ShiftCoachHC", "ActivityResult callback: no pending PluginCall (already consumed or stray)")
            return
        }
        bridge.execute {
            try {
                val ctx = context
                if (resolveSdkStatus(ctx) != HealthConnectClient.SDK_AVAILABLE) {
                    android.util.Log.w("ShiftCoachHC", "post-dialog resolveSdkStatus != SDK_AVAILABLE")
                    val ret = JSObject()
                    ret.put("granted", false)
                    ret.put("sdkUnavailable", true)
                    ret.put("permissionResult", "sdk_unavailable")
                    ret.put("activityResultGrantedCount", activityResultGranted.size)
                    call.resolve(ret)
                    return@execute
                }
                val client = createHealthConnectClient(ctx)
                val actualGranted =
                    runBlocking { client.permissionController.getGrantedPermissions() }
                android.util.Log.i(
                    "ShiftCoachHC",
                    "getGrantedPermissions after dialog: size=${actualGranted.size} $actualGranted",
                )
                val hasAll = requiredPermissions.all { p -> p in actualGranted }
                val missing = requiredPermissions.filter { it !in actualGranted }.sorted()
                android.util.Log.i(
                    "ShiftCoachHC",
                    "afterDialog hasAll=$hasAll missingPermissions=${missing.joinToString()}",
                )
                val grantedArr = JSONArray()
                actualGranted.sorted().forEach { grantedArr.put(it) }
                val missingArr = JSONArray()
                missing.forEach { missingArr.put(it) }
                val requiredArr = JSONArray()
                requiredPermissions.sorted().forEach { requiredArr.put(it) }

                val ret = JSObject()
                ret.put("granted", hasAll)
                ret.put(
                    "permissionResult",
                    when {
                        hasAll -> "all_granted"
                        missing.size == requiredPermissions.size -> "none_granted"
                        else -> "partial"
                    },
                )
                ret.put("activityResultGrantedCount", activityResultGranted.size)
                ret.put("requiredPermissions", requiredArr)
                ret.put("grantedPermissions", grantedArr)
                ret.put("missingPermissions", missingArr)
                call.resolve(ret)
            } catch (e: Exception) {
                android.util.Log.e("ShiftCoachHC", "permission ActivityResult callback failed", e)
                call.reject(
                    "health_connect_permission_callback_failed",
                    e.message ?: "unknown",
                    e,
                )
            }
        }
    }

    override fun load() {
        super.load()
        android.util.Log.i(
            "ShiftCoachHC",
            "plugin.load() invoked thread=${Thread.currentThread().name}; scheduling registerPermissionLauncherIfNeeded on main",
        )
        Handler(Looper.getMainLooper()).post {
            val ok = registerPermissionLauncherIfNeeded()
            if (!ok) {
                android.util.Log.e(
                    "ShiftCoachHC",
                    "plugin.load deferred registerPermissionLauncherIfNeeded FAILED — Connect Health Connect will not open the system sheet",
                )
            }
        }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        android.util.Log.i("ShiftCoachHC", "getStatus: PluginMethod entry thread=${Thread.currentThread().name}")
        bridge.execute {
            try {
                val ctx = context
                android.util.Log.i(
                    "ShiftCoachHC",
                    "getStatus: bridge.execute packageName=${ctx.packageName} activity=${activity?.javaClass?.name} " +
                        "permissionFlowReady=${permissionLauncher != null}",
                )
                val sdkDefault =
                    try {
                        val s = HealthConnectClient.getSdkStatus(ctx)
                        android.util.Log.i("ShiftCoachHC", "HealthConnectClient.getSdkStatus(Context) → ${sdkStatusLabel(s)} ($s)")
                        s
                    } catch (t: Throwable) {
                        android.util.Log.e("ShiftCoachHC", "HealthConnectClient.getSdkStatus(Context) threw", t)
                        HealthConnectClient.SDK_UNAVAILABLE
                    }
                val defaultProviderPackageName =
                    resolveDefaultProviderPackageName()
                val sdkProvider =
                    try {
                        val s = HealthConnectClient.getSdkStatus(ctx, defaultProviderPackageName)
                        android.util.Log.i(
                            "ShiftCoachHC",
                            "HealthConnectClient.getSdkStatus(Context, \"$defaultProviderPackageName\") → ${sdkStatusLabel(s)} ($s)",
                        )
                        s
                    } catch (t: Throwable) {
                        android.util.Log.e("ShiftCoachHC", "HealthConnectClient.getSdkStatus(Context, provider) threw", t)
                        HealthConnectClient.SDK_UNAVAILABLE
                    }
                android.util.Log.d(
                    "ShiftCoachHC",
                    "requiredPermissions (${requiredPermissions.size}): ${requiredPermissions.joinToString()}",
                )
                val extensionVersion: Int? =
                    if (Build.VERSION.SDK_INT >= 30) {
                        try {
                            SdkExtensions.getExtensionVersion(Build.VERSION_CODES.R)
                        } catch (_: Throwable) {
                            null
                        }
                    } else {
                        null
                    }
                val ret = JSObject()
                ret.put("permissionFlowReady", permissionLauncher != null)
                ret.put("sdkStatus", sdkStatusLabel(sdkDefault))
                ret.put("sdkStatusDefault", sdkStatusLabel(sdkDefault))
                ret.put("sdkStatusProvider", sdkStatusLabel(sdkProvider))
                ret.put("defaultProviderPackageName", defaultProviderPackageName)
                ret.put("androidSdkInt", Build.VERSION.SDK_INT)
                if (extensionVersion != null) {
                    ret.put("extensionVersion", extensionVersion)
                } else {
                    ret.put("extensionVersion", JSONObject.NULL)
                }

                var canCreateClient = false
                var clientCreateError: String? = null
                var granted: Set<String> = emptySet()
                try {
                    val client = createHealthConnectClient(ctx)
                    canCreateClient = true
                    granted = runBlocking { client.permissionController.getGrantedPermissions() }
                    android.util.Log.d(
                        "ShiftCoachHC",
                        "getStatus: getGrantedPermissions size=${granted.size} $granted",
                    )
                } catch (e: Throwable) {
                    canCreateClient = false
                    clientCreateError = e.message ?: e.javaClass.simpleName
                    android.util.Log.e("ShiftCoachHC", "getStatus: createHealthConnectClient or getGrantedPermissions failed", e)
                }
                ret.put("canCreateClient", canCreateClient)
                if (clientCreateError != null) {
                    ret.put("clientCreateError", clientCreateError)
                } else {
                    ret.put("clientCreateError", JSONObject.NULL)
                }

                val requiredJson = JSONArray()
                val grantedJson = JSONArray()
                val missingJson = JSONArray()
                for (perm in requiredPermissions) {
                    requiredJson.put(perm)
                    if (perm in granted) {
                        grantedJson.put(perm)
                    } else {
                        missingJson.put(perm)
                    }
                }
                ret.put("requiredPermissions", requiredJson)
                ret.put("grantedPermissions", grantedJson)
                ret.put("missingPermissions", missingJson)
                ret.put("packageName", ctx.packageName)

                val available = canCreateClient || sdkDefault == HealthConnectClient.SDK_AVAILABLE
                ret.put("available", available)
                if (!available) {
                    ret.put("hasPermissions", false)
                    call.resolve(ret)
                    return@execute
                }
                val hasAll = requiredPermissions.all { it in granted }
                ret.put("hasPermissions", hasAll)
                android.util.Log.i(
                    "ShiftCoachHC",
                    "getStatus sdk=${sdkStatusLabel(sdkDefault)} canCreate=$canCreateClient " +
                        "hasPermissions=$hasAll missing=${missingJson.length()}",
                )
                call.resolve(ret)
            } catch (e: Exception) {
                android.util.Log.e("ShiftCoachHC", "getStatus: outer catch", e)
                call.reject("health_connect_status_failed", e.message ?: "unknown", e)
            }
        }
    }

    /**
     * Requests Health Connect data permissions. Named [requestConnectPermissions] so it does not
     * collide with [Plugin.requestPermissions] (Capacitor manifest permission flow).
     */
    @PluginMethod
    fun requestConnectPermissions(call: PluginCall) {
        android.util.Log.i(
            "ShiftCoachHC",
            "requestConnectPermissions: entry thread=${Thread.currentThread().name} activity=${activity?.javaClass?.name}",
        )
        try {
            val ctx = context
            if (resolveSdkStatus(ctx) == HealthConnectClient.SDK_AVAILABLE) {
                val client = createHealthConnectClient(ctx)
                val pre =
                    runBlocking { client.permissionController.getGrantedPermissions() }
                android.util.Log.i(
                    "ShiftCoachHC",
                    "getGrantedPermissions before launch: size=${pre.size} $pre",
                )
            } else {
                android.util.Log.w(
                    "ShiftCoachHC",
                    "requestConnectPermissions: SDK not AVAILABLE before main-thread launch; proceeding to register+launch for diagnostics",
                )
            }
        } catch (e: Exception) {
            android.util.Log.w("ShiftCoachHC", "requestConnectPermissions: pre-launch getGrantedPermissions skipped", e)
        }
        // registerForActivityResult / launch must run on the main thread (ActivityResultRegistryOwner).
        Handler(Looper.getMainLooper()).post {
            android.util.Log.i("ShiftCoachHC", "requestConnectPermissions: on main looper")
            if (!registerPermissionLauncherIfNeeded()) {
                call.reject(
                    "health_connect_ui_unavailable",
                    "Could not register Health Connect permission UI (activity not FragmentActivity?)",
                )
                return@post
            }
            val launcher = permissionLauncher
            if (launcher == null) {
                android.util.Log.e("ShiftCoachHC", "requestConnectPermissions: permissionLauncher still null after register")
                call.reject(
                    "health_connect_ui_unavailable",
                    "ActivityResultLauncher not registered",
                )
                return@post
            }
            if (!pendingPermissionCall.compareAndSet(null, call)) {
                call.reject("health_connect_busy", "Another permission request is in progress")
                return@post
            }
            try {
                android.util.Log.i(
                    "ShiftCoachHC",
                    "requestPermissionLauncher.launch called with ${requiredPermissions.size} permissions: " +
                        requiredPermissions.joinToString(),
                )
                launcher.launch(requiredPermissions)
                android.util.Log.i("ShiftCoachHC", "requestPermissionLauncher.launch returned (sheet should be visible)")
            } catch (e: Exception) {
                pendingPermissionCall.set(null)
                android.util.Log.e("ShiftCoachHC", "requestPermissionLauncher.launch FAILED", e)
                call.reject("health_connect_launch_failed", e.message ?: "unknown", e)
            }
        }
    }

    /**
     * Opens Health Connect permission UI for this app (API 34+), or app system settings as fallback.
     */
    @PluginMethod
    fun openPermissionSettings(call: PluginCall) {
        bridge.execute {
            val ctx = context
            val act = activity

            fun startIntent(intent: Intent): Boolean {
                return try {
                    if (act != null) {
                        act.startActivity(intent)
                    } else {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        ctx.startActivity(intent)
                    }
                    true
                } catch (e: Exception) {
                    android.util.Log.w("ShiftCoachHC", "startIntent failed action=${intent.action}", e)
                    false
                }
            }

            // 1) Android 14+: in-app Health Connect permission manager (requires correct extra).
            if (Build.VERSION.SDK_INT >= 34) {
                try {
                    val intent =
                        Intent(HealthConnectManager.ACTION_MANAGE_HEALTH_PERMISSIONS).apply {
                            // API 34+ docs: use Intent.EXTRA_PACKAGE_NAME for the requesting app.
                            putExtra(Intent.EXTRA_PACKAGE_NAME, ctx.packageName)
                        }
                    val target = intent.resolveActivity(ctx.packageManager)
                    android.util.Log.d(
                        "ShiftCoachHC",
                        "MANAGE_HEALTH_PERMISSIONS resolve=$target pkg=${ctx.packageName}",
                    )
                    if (target != null && startIntent(intent)) {
                        call.resolve()
                        return@execute
                    }
                } catch (e: Exception) {
                    android.util.Log.e("ShiftCoachHC", "MANAGE_HEALTH_PERMISSIONS failed", e)
                }
            }

            // 2) Google Health Connect app details (data access & connected apps on many devices).
            val hcPackage = healthConnectProviderPackage
            val hcAppDetails =
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", hcPackage, null)
                }
            if (hcAppDetails.resolveActivity(ctx.packageManager) != null && startIntent(hcAppDetails)) {
                call.resolve()
                return@execute
            }

            // 3) This app’s details (HC may deep-link from “related apps” on some OEMs).
            val selfDetails =
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", ctx.packageName, null)
                }
            if (startIntent(selfDetails)) {
                call.resolve()
                return@execute
            }

            // 4) Last resort: main Settings — user can search “Health Connect”.
            val settingsHome = Intent(Settings.ACTION_SETTINGS)
            if (startIntent(settingsHome)) {
                call.resolve()
                return@execute
            }

            call.reject(
                "health_connect_open_settings_failed",
                "No settings intent could be started",
            )
        }
    }

    /**
     * Opens the Google Play listing for Health Connect (`com.google.android.apps.healthdata`).
     * Used when [HealthConnectClient] reports the provider is missing or needs an update.
     */
    @PluginMethod
    fun openHealthConnectInstallPage(call: PluginCall) {
        bridge.execute {
            val ctx = context
            val act = activity

            fun startIntent(intent: Intent): Boolean {
                return try {
                    if (act != null) {
                        act.startActivity(intent)
                    } else {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        ctx.startActivity(intent)
                    }
                    true
                } catch (e: Exception) {
                    android.util.Log.w("ShiftCoachHC", "openInstall startIntent failed", e)
                    false
                }
            }

            val market =
                Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$healthConnectProviderPackage"))
            if (startIntent(market)) {
                android.util.Log.i("ShiftCoachHC", "opened Play market for Health Connect")
                call.resolve()
                return@execute
            }

            val web =
                Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=$healthConnectProviderPackage"),
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            if (startIntent(web)) {
                android.util.Log.i("ShiftCoachHC", "opened Play https page for Health Connect")
                call.resolve()
                return@execute
            }

            call.reject("health_connect_open_store_failed", "Could not open Play Store or browser")
        }
    }

    @PluginMethod
    fun syncNow(call: PluginCall) {
        android.util.Log.i("ShiftCoachHC", "syncNow: PluginMethod entry")
        bridge.execute {
            try {
                val ctx = context
                if (resolveSdkStatus(ctx) != HealthConnectClient.SDK_AVAILABLE) {
                    call.reject(
                        "health_connect_unavailable",
                        "Health Connect is not available on this device",
                    )
                    return@execute
                }
                val client = createHealthConnectClient(ctx)
                val granted =
                    runBlocking { client.permissionController.getGrantedPermissions() }
                if (!requiredPermissions.all { it in granted }) {
                    val err = JSObject()
                    err.put("needsPermissions", true)
                    call.reject(
                        "health_connect_permissions",
                        "Grant Health Connect permissions first",
                        err,
                    )
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

                val origin =
                    webOrigin()
                        ?: run {
                            call.reject(
                                "health_connect_no_origin",
                                "Could not read app URL for API call",
                            )
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
                android.util.Log.e("ShiftCoachHC", "syncNow failed", e)
                call.reject("health_connect_sync_failed", e.message ?: "unknown", e)
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

    private fun sdkStatusLabel(status: Int): String =
        when (status) {
            HealthConnectClient.SDK_AVAILABLE -> "SDK_AVAILABLE"
            HealthConnectClient.SDK_UNAVAILABLE -> "SDK_UNAVAILABLE"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ->
                "SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED"
            else -> "UNKNOWN_$status"
        }
}
