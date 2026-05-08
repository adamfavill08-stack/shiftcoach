package com.shiftcoach.app

import android.net.Uri
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.health.connect.HealthConnectManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.os.ext.SdkExtensions
import android.webkit.CookieManager
import androidx.activity.ComponentActivity
import androidx.fragment.app.FragmentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.AggregateGroupByDurationRequest
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
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.Duration
import java.time.temporal.ChronoUnit
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

/**
 * Phone-side Health Connect → POST /api/health-connect/sync.
 * Auth: [pullAuthFromWebSession] reads the Supabase session from WebView `localStorage` (no token in Capacitor `methodData`).
 * [syncNow] sends `Authorization: Bearer …`. WebView cookies may still be sent when present.
 * Steps: use [HealthConnectClient.aggregate] with [StepsRecord.COUNT_TOTAL] so HC dedupes watch/phone
 * (summing raw [StepsRecord] intervals can under-count or mis-handle merged sources). Falls back to readRecords sum.
 */
@CapacitorPlugin(name = "ShiftCoachHealthConnect")
class ShiftCoachHealthConnectPlugin : Plugin() {

    companion object {
        /** Production hosted app; matches `capacitor.config.ts` default. Emulator dev uses live WebView URL when set. */
        private const val DEFAULT_SYNC_API_ORIGIN = "https://www.shiftcoach.app"
        private const val PREFS = "shiftcoach_hc_native"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_LAST_SYNC_AT = "last_successful_sync_at"
        private const val KEY_SYNC_ORIGIN = "sync_origin"

        @Volatile
        private var instance: ShiftCoachHealthConnectPlugin? = null

        @JvmStatic
        fun handleHcContractResult(contractGranted: Set<String>) {
            val p = instance
            if (p == null) {
                android.util.Log.e(
                    "ShiftCoachHC",
                    "handleHcContractResult: ShiftCoachHealthConnectPlugin instance is null",
                )
                return
            }
            p.deliverPermissionActivityResult(contractGranted)
        }
    }

    init {
        hci("ShiftCoachHealthConnectPlugin constructor / class load OK (${javaClass.name})")
    }

    /** Google Health Connect provider (see Health Connect Jetpack docs). */
    private val healthConnectProviderPackage = "com.google.android.apps.healthdata"

    private val requiredPermissions: Set<String> =
        setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
        )

    private val pendingPermissionCall = AtomicReference<PluginCall?>(null)

    /**
     * API origin for `/api/health-connect/sync`, set only on the main thread from [WebView.getUrl].
     * [syncNow] runs on `CapacitorPlugins` — it must never read the WebView there (wrong-thread crash).
     */
    @Volatile
    private var cachedWebOrigin: String = ""

    /**
     * Supabase access token for `/api/health-connect/sync`, populated by [pullAuthFromWebSession] from WebView storage.
     * In-memory only; never logged; cleared by [clearNativeHealthConnectAuth].
     */
    @Volatile
    private var bearerAccessToken: String? = null

    private fun nativePrefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Permission-flow diagnostics for debug logcat / optional getStatus.hcDiagnostics (no health sample values). */
    @Volatile
    private var lastPermissionLaunchMs: Long = 0L

    @Volatile
    private var lastPermissionCallbackMs: Long = 0L

    @Volatile
    private var lastNativeErrorBrief: String? = null

    private fun hci(msg: String) {
        if (BuildConfig.HC_VERBOSE_LOG) android.util.Log.i("ShiftCoachHC", msg)
    }

    private fun hcd(msg: String) {
        if (BuildConfig.HC_VERBOSE_LOG) android.util.Log.d("ShiftCoachHC", msg)
    }

    private fun hcw(msg: String, t: Throwable? = null) {
        if (!BuildConfig.HC_VERBOSE_LOG) return
        if (t != null) android.util.Log.w("ShiftCoachHC", msg, t) else android.util.Log.w("ShiftCoachHC", msg)
    }

    private fun hce(msg: String, t: Throwable? = null) {
        if (!BuildConfig.HC_VERBOSE_LOG) return
        if (t != null) android.util.Log.e("ShiftCoachHC", msg, t) else android.util.Log.e("ShiftCoachHC", msg)
    }

    private fun recordNativeError(t: Throwable) {
        lastNativeErrorBrief =
            (t.javaClass.simpleName + ": " + (t.message ?: "") + "\n" + android.util.Log.getStackTraceString(t))
                .take(8000)
    }

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
                hcd("resolveSdkStatus: used single-arg getSdkStatus → ${sdkStatusLabel(s)}")
                s
            } else {
                val s = HealthConnectClient.getSdkStatus(ctx, healthConnectProviderPackage)
                hcd("resolveSdkStatus: no single-arg API; provider getSdkStatus → ${sdkStatusLabel(s)}")
                s
            }
        } catch (t: Throwable) {
            hcw("resolveSdkStatus: exception, falling back to provider package", t)
            recordNativeError(t)
            try {
                HealthConnectClient.getSdkStatus(ctx, healthConnectProviderPackage)
            } catch (t2: Throwable) {
                hce("resolveSdkStatus: fallback failed", t2)
                recordNativeError(t2)
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

    /** Health Connect permission dialog result — always re-query granted set from the platform. */
    private fun deliverPermissionActivityResult(activityResultGranted: Set<String>) {
        lastPermissionCallbackMs = System.currentTimeMillis()
        hci(
            "ActivityResult callback fired contractGrantedSize=${activityResultGranted.size} " +
                activityResultGranted.joinToString(prefix = "[", postfix = "]"),
        )
        val call = pendingPermissionCall.getAndSet(null)
        if (call == null) {
            hcw("ActivityResult callback: no pending PluginCall (already consumed or stray)")
            return
        }
        bridge.execute {
            try {
                val ctx = context
                if (resolveSdkStatus(ctx) != HealthConnectClient.SDK_AVAILABLE) {
                    hcw("post-dialog resolveSdkStatus != SDK_AVAILABLE")
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
                hci(
                    "getGrantedPermissions after request: size=${actualGranted.size} ids=${actualGranted.sorted().joinToString()}",
                )
                val hasAll = requiredPermissions.all { p -> p in actualGranted }
                val missing = requiredPermissions.filter { it !in actualGranted }.sorted()
                hci("afterDialog hasAll=$hasAll missingPermissionIds=${missing.joinToString()}")
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
                lastNativeErrorBrief = null
                call.resolve(ret)
            } catch (e: Exception) {
                hce("permission ActivityResult callback failed", e)
                recordNativeError(e)
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
        instance = this
        hci(
            "plugin.load() instance bound for HC callbacks; launcherOwnedByMainActivity=${HealthConnectPermissionBridge.isRegistered()}",
        )
        Handler(Looper.getMainLooper()).post {
            refreshCachedWebOriginFromWebView()
        }
    }

    /** Must run on the main thread — touches [android.webkit.WebView]. */
    private fun refreshCachedWebOriginFromWebView() {
        try {
            val wv = bridge?.webView
            if (wv == null) {
                hci("refreshCachedWebOriginFromWebView: bridge.webView null")
                return
            }
            val url = wv.url
            if (url.isNullOrBlank()) {
                hci("refreshCachedWebOriginFromWebView: url blank")
                return
            }
            val u = Uri.parse(url)
            val scheme = u.scheme ?: return
            val host = u.host ?: return
            val port = u.port
            cachedWebOrigin =
                if (port != -1 && port != 80 && port != 443) {
                    "$scheme://$host:$port"
                } else {
                    "$scheme://$host"
                }
            nativePrefs().edit().putString(KEY_SYNC_ORIGIN, cachedWebOrigin).apply()
            hci("refreshCachedWebOriginFromWebView: cached=$cachedWebOrigin")
        } catch (e: Exception) {
            hcw("refreshCachedWebOriginFromWebView failed", e)
        }
    }

    /**
     * Resolves sync POST origin without touching WebView (may run on [bridge.execute] / CapacitorPlugins thread).
     */
    private fun syncApiOrigin(): String {
        val persisted = nativePrefs().getString(KEY_SYNC_ORIGIN, null)?.trim()?.trimEnd('/').orEmpty()
        val trimmed = if (persisted.isNotEmpty()) persisted else cachedWebOrigin.trim().trimEnd('/')
        val resolved =
            if (trimmed.isNotEmpty()) {
                trimmed
            } else {
                DEFAULT_SYNC_API_ORIGIN.trimEnd('/')
            }
        hci(
            "syncApiOrigin=$resolved (fromWebViewCache=${trimmed.isNotEmpty()} thread=${Thread.currentThread().name})",
        )
        return resolved
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        hci("getStatus: PluginMethod entry thread=${Thread.currentThread().name}")
        bridge.execute {
            try {
                val ctx = context
                hci(
                    "getStatus: bridge.execute packageName=${ctx.packageName} activity=${activity?.javaClass?.name} " +
                        "permissionFlowReady=${HealthConnectPermissionBridge.isRegistered()}",
                )
                val sdkDefault =
                    try {
                        val s = HealthConnectClient.getSdkStatus(ctx)
                        hci("HealthConnectClient.getSdkStatus(Context) → ${sdkStatusLabel(s)} ($s)")
                        s
                    } catch (t: Throwable) {
                        hce("HealthConnectClient.getSdkStatus(Context) threw", t)
                        recordNativeError(t)
                        HealthConnectClient.SDK_UNAVAILABLE
                    }
                val defaultProviderPackageName =
                    resolveDefaultProviderPackageName()
                val sdkProvider =
                    try {
                        val s = HealthConnectClient.getSdkStatus(ctx, defaultProviderPackageName)
                        hci(
                            "HealthConnectClient.getSdkStatus(Context, \"$defaultProviderPackageName\") → ${sdkStatusLabel(s)} ($s)",
                        )
                        s
                    } catch (t: Throwable) {
                        hce("HealthConnectClient.getSdkStatus(Context, provider) threw", t)
                        recordNativeError(t)
                        HealthConnectClient.SDK_UNAVAILABLE
                    }
                hcd(
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
                ret.put("permissionFlowReady", HealthConnectPermissionBridge.isRegistered())
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
                    hcd(
                        "getStatus: getGrantedPermissions size=${granted.size} ids=${granted.sorted().joinToString()}",
                    )
                } catch (e: Throwable) {
                    canCreateClient = false
                    clientCreateError = e.message ?: e.javaClass.simpleName
                    hce("getStatus: createHealthConnectClient or getGrantedPermissions failed", e)
                    recordNativeError(e)
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
                    attachHcLauncherDiagnostics(ret, ctx, sdkDefault, granted, missingJson)
                    putHcDiagnostics(ret, ctx, sdkDefault, granted, missingJson.length())
                    call.resolve(ret)
                    return@execute
                }
                val hasAll = requiredPermissions.all { it in granted }
                ret.put("hasPermissions", hasAll)
                hci(
                    "getStatus sdk=${sdkStatusLabel(sdkDefault)} canCreate=$canCreateClient " +
                        "hasPermissions=$hasAll missing=${missingJson.length()}",
                )
                attachHcLauncherDiagnostics(ret, ctx, sdkDefault, granted, missingJson)
                putHcDiagnostics(ret, ctx, sdkDefault, granted, missingJson.length())
                call.resolve(ret)
            } catch (e: Exception) {
                hce("getStatus: outer catch", e)
                recordNativeError(e)
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
        hci(
            "requestConnectPermissions: entry thread=${Thread.currentThread().name} activity=${activity?.javaClass?.name}",
        )
        try {
            val ctx = context
            if (resolveSdkStatus(ctx) == HealthConnectClient.SDK_AVAILABLE) {
                val client = createHealthConnectClient(ctx)
                val pre =
                    runBlocking { client.permissionController.getGrantedPermissions() }
                hci(
                    "getGrantedPermissions before request: size=${pre.size} ids=${pre.sorted().joinToString()}",
                )
            } else {
                hcw(
                    "requestConnectPermissions: SDK not AVAILABLE before main-thread launch; proceeding to register+launch for diagnostics",
                )
            }
        } catch (e: Exception) {
            hcw("requestConnectPermissions: pre-launch getGrantedPermissions skipped", e)
        }
        // registerForActivityResult / launch must run on the main thread (ActivityResultRegistryOwner).
        Handler(Looper.getMainLooper()).post {
            hci("requestConnectPermissions: on main looper")
            if (!HealthConnectPermissionBridge.isRegistered()) {
                hce("requestConnectPermissions: HealthConnectPermissionBridge launcher not registered")
                call.reject(
                    "health_connect_ui_unavailable",
                    "Health Connect permission UI is not registered on MainActivity",
                )
                return@post
            }
            if (!pendingPermissionCall.compareAndSet(null, call)) {
                call.reject("health_connect_busy", "Another permission request is in progress")
                return@post
            }
            try {
                hci("Plugin requestConnectPermissions calling MainActivity launchHealthConnectPermissions")
                lastPermissionLaunchMs = System.currentTimeMillis()
                val launched = HealthConnectPermissionBridge.launchHealthConnectPermissions(requiredPermissions)
                if (!launched) {
                    pendingPermissionCall.set(null)
                    call.reject(
                        "health_connect_launch_failed",
                        HealthConnectPermissionBridge.lastLaunchError ?: "launch returned false",
                    )
                }
            } catch (e: Exception) {
                pendingPermissionCall.set(null)
                hce("requestConnectPermissions launch path FAILED", e)
                recordNativeError(e)
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
                    hcw("startIntent failed action=${intent.action}", e)
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
                    hcd(
                        "MANAGE_HEALTH_PERMISSIONS resolve=$target pkg=${ctx.packageName}",
                    )
                    if (target != null && startIntent(intent)) {
                        call.resolve()
                        return@execute
                    }
                } catch (e: Exception) {
                    hce("MANAGE_HEALTH_PERMISSIONS failed", e)
                    recordNativeError(e)
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
                    hcw("openInstall startIntent failed", e)
                    false
                }
            }

            val market =
                Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$healthConnectProviderPackage"))
            if (startIntent(market)) {
                hci("opened Play market for Health Connect")
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
                hci("opened Play https page for Health Connect")
                call.resolve()
                return@execute
            }

            call.reject("health_connect_open_store_failed", "Could not open Play Store or browser")
        }
    }

    private fun decodeJsStringReturn(encoded: String?): String? {
        if (encoded == null) return null
        val trimmed = encoded.trim()
        if (trimmed.isEmpty() || trimmed == "null") return null
        return try {
            (JSONTokener(trimmed).nextValue() as? String)?.trim()?.takeIf { it.isNotEmpty() }
        } catch (_: Throwable) {
            null
        }
    }

    private fun readAccessTokenFromCall(call: PluginCall): String? {
        for (key in listOf("accessToken", "access_token")) {
            val s = call.getString(key)?.trim()
            if (!s.isNullOrEmpty()) return s
        }
        return null
    }

    /**
     * **Deprecated / back-compat only:** older Web bundles may still call this after a native-only update.
     * Prefer [pullAuthFromWebSession] (no JWT in bridge `methodData`). Never logs the token string.
     */
    @PluginMethod
    fun setAuthToken(call: PluginCall) {
        bridge.execute {
            val trimmed = readAccessTokenFromCall(call)
            bearerAccessToken = if (trimmed.isNullOrEmpty()) null else trimmed
            if (bearerAccessToken != null) {
                nativePrefs().edit().putString(KEY_ACCESS_TOKEN, bearerAccessToken).apply()
            } else {
                nativePrefs().edit().remove(KEY_ACCESS_TOKEN).apply()
            }
            if (BuildConfig.HC_VERBOSE_LOG) {
                hci("setAuthToken (compat) authTokenPresent=${bearerAccessToken != null}")
            }
            call.resolve()
        }
    }

    /**
     * Reads Supabase `access_token` from WebView `localStorage` (keys containing `-auth-token`).
     * Invoked with **no plugin arguments** so Capacitor bridge logs cannot contain the JWT.
     */
    @PluginMethod
    fun pullAuthFromWebSession(call: PluginCall) {
        val act = activity
        if (act == null) {
            call.reject("health_connect_pull_auth_failed", "Activity unavailable")
            return
        }
        act.runOnUiThread {
            try {
                val wv = bridge.webView
                if (wv == null) {
                    bearerAccessToken = null
                    val r = JSObject()
                    r.put("tokenPresent", false)
                    call.resolve(r)
                    return@runOnUiThread
                }
                val js =
                    "(function(){try{var k=Object.keys(localStorage||{});" +
                        "for(var i=0;i<k.length;i++){var key=k[i];" +
                        "if(key.indexOf('-auth-token')!==-1){" +
                        "var raw=localStorage.getItem(key);if(!raw)continue;" +
                        "var o=JSON.parse(raw);var t=o&&o.access_token;" +
                        "if(typeof t==='string'&&t.length>0)return t;}}" +
                        "}catch(e){}return '';})()"
                wv.evaluateJavascript(js) { encoded ->
                    bridge.execute {
                        try {
                            bearerAccessToken = decodeJsStringReturn(encoded)?.takeIf { it.isNotBlank() }
                            if (bearerAccessToken != null) {
                                nativePrefs().edit().putString(KEY_ACCESS_TOKEN, bearerAccessToken).apply()
                            } else {
                                nativePrefs().edit().remove(KEY_ACCESS_TOKEN).apply()
                            }
                        } catch (_: Throwable) {
                            bearerAccessToken = null
                            nativePrefs().edit().remove(KEY_ACCESS_TOKEN).apply()
                        }
                        val r = JSObject()
                        r.put("tokenPresent", bearerAccessToken != null)
                        call.resolve(r)
                    }
                }
            } catch (e: Exception) {
                bearerAccessToken = null
                call.reject("health_connect_pull_auth_failed", e.message ?: "unknown", e)
            }
        }
    }

    @PluginMethod
    fun clearNativeHealthConnectAuth(call: PluginCall) {
        bridge.execute {
            bearerAccessToken = null
            nativePrefs().edit().remove(KEY_ACCESS_TOKEN).remove(KEY_LAST_SYNC_AT).apply()
            if (BuildConfig.HC_VERBOSE_LOG) {
                hci("clearNativeHealthConnectAuth done")
            }
            call.resolve()
        }
    }

    @PluginMethod
    fun syncNow(call: PluginCall) {
        hci("syncNow: PluginMethod entry")
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

                var bearer = bearerAccessToken?.trim()?.takeIf { it.isNotEmpty() }
                if (bearer == null) {
                    val fromPrefs =
                        nativePrefs().getString(KEY_ACCESS_TOKEN, null)?.trim()?.takeIf { it.isNotEmpty() }
                    if (fromPrefs != null) {
                        bearerAccessToken = fromPrefs
                        bearer = fromPrefs
                    }
                }
                if (bearer == null) {
                    if (BuildConfig.HC_VERBOSE_LOG) {
                        hci("syncNow aborted authTokenPresent=false path=/api/health-connect/sync")
                    }
                    call.reject(
                        "health_connect_auth_missing",
                        "Please sign in again before syncing Health Connect.",
                    )
                    return@execute
                }

                val zone = ZoneId.systemDefault()
                val now = Instant.now()
                val todayLocal = ZonedDateTime.now(zone).toLocalDate()
                val fineRangeStart = todayLocal.minusDays(2).atStartOfDay(zone).toInstant()
                // Last 7 local civil days (inclusive): today .. today-6
                val stepsRangeStart = todayLocal.minusDays(6).atStartOfDay(zone).toInstant()
                val stepsDateRangeStart = stepsRangeStart.toString()
                val stepsDateRangeEnd = now.toString()

                val dailyStepsArr = JSONArray()
                val stepSamplesArr = JSONArray()
                var stepsTotalSevenDays = 0L
                var stepsTodayForCompat = 0L
                /** Today's interval record count from readRecords (0 if aggregate-only fallback). */
                var todayStepRecordsCount = 0
                var todayFirstStepAt: String? = null
                var todayLastStepAt: String? = null

                runBlocking {
                    try {
                        val grouped =
                            client.aggregateGroupByDuration(
                                AggregateGroupByDurationRequest(
                                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                                    timeRangeFilter = TimeRangeFilter.between(fineRangeStart, now),
                                    timeRangeSlicer = Duration.ofMinutes(15),
                                ),
                            )
                        for (bucket in grouped) {
                            val stepsInBucket = bucket.result[StepsRecord.COUNT_TOTAL] ?: 0L
                            val o = JSONObject()
                            o.put("timestamp", bucket.startTime.toString())
                            o.put("endTimestamp", bucket.endTime.toString())
                            o.put("steps", stepsInBucket.coerceIn(0L, Int.MAX_VALUE.toLong()).toInt())
                            stepSamplesArr.put(o)
                        }
                    } catch (e: Exception) {
                        if (BuildConfig.HC_VERBOSE_LOG) {
                            hci("aggregateGroupByDuration(15m) failed: ${e.message}")
                        }
                    }
                }

                runBlocking {
                    for (offset in 6 downTo 0) {
                        val day = todayLocal.minusDays(offset.toLong())
                        val start = day.atStartOfDay(zone).toInstant()
                        val endExclusive = day.plusDays(1).atStartOfDay(zone).toInstant()
                        val end = if (endExclusive > now) now else endExclusive
                        var daySteps = 0L
                        var recordCountForDay = 0
                        if (start < end) {
                            try {
                                val req =
                                    ReadRecordsRequest(
                                        StepsRecord::class,
                                        timeRangeFilter = TimeRangeFilter.between(start, end),
                                    )
                                val resp = client.readRecords(req)
                                recordCountForDay = resp.records.size
                                daySteps = resp.records.sumOf { it.count.toLong() }
                                if (resp.records.isNotEmpty()) {
                                    val minStart = resp.records.minOf { it.startTime }
                                    val maxEnd = resp.records.maxOf { it.endTime }
                                    if (day == todayLocal) {
                                        todayStepRecordsCount = recordCountForDay
                                        todayFirstStepAt = minStart.toString()
                                        todayLastStepAt = maxEnd.toString()
                                    }
                                }
                            } catch (e: Exception) {
                                if (BuildConfig.HC_VERBOSE_LOG) {
                                    hci("readRecords steps failed for $day: ${e.message}")
                                }
                                recordCountForDay = 0
                                daySteps = 0L
                            }
                            // Many devices return many small intervals; aggregate can still be 0 — use HC aggregate as fallback only when no intervals.
                            if (recordCountForDay == 0 && daySteps == 0L) {
                                try {
                                    val agg =
                                        client.aggregate(
                                            AggregateRequest(
                                                metrics = setOf(StepsRecord.COUNT_TOTAL),
                                                timeRangeFilter = TimeRangeFilter.between(start, end),
                                            ),
                                        )
                                    daySteps = agg[StepsRecord.COUNT_TOTAL] ?: 0L
                                    if (BuildConfig.HC_VERBOSE_LOG && daySteps > 0L) {
                                        hci("steps aggregate fallback for $day → $daySteps (no interval records)")
                                    }
                                } catch (e2: Exception) {
                                    if (BuildConfig.HC_VERBOSE_LOG) {
                                        hci("aggregate fallback failed for $day: ${e2.message}")
                                    }
                                }
                            }
                        }
                        val dayStepsInt = daySteps.coerceIn(0L, Int.MAX_VALUE.toLong()).toInt()
                        val o = JSONObject()
                        o.put("activityDate", day.toString())
                        o.put("steps", dayStepsInt)
                        dailyStepsArr.put(o)
                        stepsTotalSevenDays += daySteps
                        if (day == todayLocal) {
                            stepsTodayForCompat = daySteps
                        }
                    }
                }

                val stepsRecordCount =
                    if (todayStepRecordsCount > 0) {
                        todayStepRecordsCount
                    } else if (stepsTodayForCompat > 0L) {
                        -1
                    } else {
                        0
                    }

                val stepsTotal = stepsTodayForCompat

                val sleepFrom = now.minus(14, ChronoUnit.DAYS)
                val sleepDateRangeStart = sleepFrom.toString()
                val sleepDateRangeEnd = now.toString()

                val sleepArr = JSONArray()
                var sleepTotalMinutes = 0L
                runBlocking {
                    val req =
                        ReadRecordsRequest(
                            SleepSessionRecord::class,
                            TimeRangeFilter.between(sleepFrom, now),
                        )
                    val resp = client.readRecords(req)
                    for (session in resp.records) {
                        sleepTotalMinutes += ChronoUnit.MINUTES.between(session.startTime, session.endTime)
                        val o = JSONObject()
                        o.put("start", session.startTime.toString())
                        o.put("end", session.endTime.toString())
                        session.metadata.id?.let { o.put("sampleId", it.toString()) }
                        sleepArr.put(o)
                    }
                }
                val sleepSessionCount = sleepArr.length()

                // Match server baseline (≈14d) for between-shift recovery + resting vs baseline — 2d was too short.
                val hrFrom = now.minus(14, ChronoUnit.DAYS)
                val heartRateDateRangeStart = hrFrom.toString()
                val heartRateDateRangeEnd = now.toString()

                val hrArr = JSONArray()
                var heartRateSampleCount = 0
                var heartRateRecordCount = 0
                val maxHr = 10000
                runBlocking {
                    val req =
                        ReadRecordsRequest(
                            HeartRateRecord::class,
                            TimeRangeFilter.between(hrFrom, now),
                        )
                    val resp = client.readRecords(req)
                    heartRateRecordCount = resp.records.size
                    outer@ for (rec in resp.records) {
                        for (sample in rec.samples) {
                            if (heartRateSampleCount >= maxHr) break@outer
                            val o = JSONObject()
                            o.put("bpm", sample.beatsPerMinute.toInt())
                            o.put("ts", sample.time.toString())
                            hrArr.put(o)
                            heartRateSampleCount++
                        }
                    }
                }

                val syncedAt = Instant.now().toString()
                val body = JSONObject()
                val stepsInt = stepsTotal.coerceIn(0L, Int.MAX_VALUE.toLong()).toInt()
                body.put("steps", stepsInt)
                body.put("activityDate", todayLocal.toString())
                body.put("dailySteps", dailyStepsArr)
                body.put("stepSamples", stepSamplesArr)
                body.put("sleep", sleepArr)
                body.put("heartRate", hrArr)
                body.put("syncedAt", syncedAt)
                body.put("stepRecordsReadToday", todayStepRecordsCount)
                if (todayFirstStepAt != null) {
                    body.put("firstStepRecordAt", todayFirstStepAt)
                }
                if (todayLastStepAt != null) {
                    body.put("lastStepRecordAt", todayLastStepAt)
                }
                body.put("loggedAt", todayLastStepAt ?: syncedAt)

                if (BuildConfig.HC_VERBOSE_LOG) {
                    hci(
                        "HC steps debug: perms=${granted.contains(HealthPermission.getReadPermission(StepsRecord::class))} " +
                            "range=[$stepsDateRangeStart .. $stepsDateRangeEnd] " +
                            "stepSamples15m=${stepSamplesArr.length()} " +
                            "today=$todayLocal todayRecords=$todayStepRecordsCount " +
                            "first=$todayFirstStepAt last=$todayLastStepAt summedToday=$stepsInt " +
                            "dailyRows=${dailyStepsArr.length()}",
                    )
                }

                val origin = syncApiOrigin()

                val cookie = CookieManager.getInstance().getCookie(origin) ?: ""
                val url = URL(origin.trimEnd('/') + "/api/health-connect/sync")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 30_000
                conn.readTimeout = 60_000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.setRequestProperty("Accept", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $bearer")
                if (cookie.isNotEmpty()) {
                    conn.setRequestProperty("Cookie", cookie)
                }
                conn.outputStream.use { os ->
                    os.write(body.toString().toByteArray(StandardCharsets.UTF_8))
                }
                val code = conn.responseCode
                val stream =
                    if (code in 200..299) conn.inputStream else conn.errorStream ?: conn.inputStream
                val responseText =
                    BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { it.readText() }
                conn.disconnect()

                if (BuildConfig.HC_VERBOSE_LOG) {
                    hci("syncNow httpStatus=$code authTokenPresent=true path=/api/health-connect/sync")
                }

                if (code !in 200..299) {
                    call.reject(
                        "health_connect_http_$code",
                        "Sync failed: HTTP $code",
                    )
                    return@execute
                }

                val ret = JSObject()
                ret.put("ok", true)
                ret.put("lastSyncedAt", syncedAt)
                nativePrefs().edit().putString(KEY_LAST_SYNC_AT, syncedAt).apply()
                val stepsOut = stepsTotal.coerceIn(0L, Int.MAX_VALUE.toLong()).toInt()
                val dailyStepsTotalInt =
                    stepsTotalSevenDays.coerceIn(0L, Int.MAX_VALUE.toLong()).toInt()
                ret.put("steps", stepsOut)
                ret.put("dailyStepsCount", dailyStepsArr.length())
                ret.put("dailyStepsTotal", dailyStepsTotalInt)
                ret.put("stepsRecordCount", stepsRecordCount)
                ret.put("sleepCount", sleepSessionCount)
                ret.put("sleepSessionCount", sleepSessionCount)
                ret.put(
                    "sleepTotalMinutes",
                    sleepTotalMinutes.coerceIn(0L, Int.MAX_VALUE.toLong()).toInt(),
                )
                ret.put("heartRateCount", heartRateSampleCount)
                ret.put("heartRateSampleCount", heartRateSampleCount)
                ret.put("heartRateRecordCount", heartRateRecordCount)
                ret.put("dateRangeStart", stepsDateRangeStart)
                ret.put("dateRangeEnd", stepsDateRangeEnd)
                ret.put("sleepDateRangeStart", sleepDateRangeStart)
                ret.put("sleepDateRangeEnd", sleepDateRangeEnd)
                ret.put("heartRateDateRangeStart", heartRateDateRangeStart)
                ret.put("heartRateDateRangeEnd", heartRateDateRangeEnd)
                val emptyIngestion =
                    dailyStepsTotalInt == 0 && sleepSessionCount == 0 && heartRateSampleCount == 0
                ret.put("recentDataLikelyEmpty", emptyIngestion)

                try {
                    val json = JSONObject(responseText)
                    if (json.has("persisted")) {
                        val p = json.getJSONObject("persisted")
                        val sp = JSObject()
                        sp.put("stepsPersisted", p.optBoolean("stepsPersisted"))
                        sp.put("persistedDailyStepsCount", p.optInt("persistedDailyStepsCount"))
                        sp.put("dailyStepsCount", p.optInt("dailyStepsCount"))
                        sp.put("dailyStepsTotal", p.optInt("dailyStepsTotal"))
                        if (p.has("datesPersisted") && p.get("datesPersisted") is JSONArray) {
                            val src = p.getJSONArray("datesPersisted")
                            val datesArr = JSONArray()
                            for (i in 0 until src.length()) {
                                datesArr.put(src.optString(i))
                            }
                            sp.put("datesPersisted", datesArr)
                        }
                        sp.put("sleepSessionsPersisted", p.optInt("sleepSessionsPersisted"))
                        sp.put("heartRateSamplesPersisted", p.optInt("heartRateSamplesPersisted"))
                        ret.put("serverPersisted", sp)
                    }
                    if (json.has("_devSyncDiagnostics")) {
                        ret.put(
                            "serverDevDiagnostics",
                            jsonObjectToJSObject(json.getJSONObject("_devSyncDiagnostics")),
                        )
                    }
                    if (json.has("syncResult")) {
                        val sr = json.getJSONObject("syncResult")
                        val syncObj = JSObject()
                        syncObj.put("stepsRead", sr.optInt("stepsRead", stepsOut))
                        syncObj.put("stepRecordsRead", sr.optInt("stepRecordsRead", todayStepRecordsCount))
                        syncObj.put("stepsSaved", sr.optInt("stepsSaved", 0))
                        syncObj.put("activityDate", sr.optString("activityDate", todayLocal.toString()))
                        syncObj.put("saved", sr.optBoolean("saved", false))
                        syncObj.put("source", sr.optString("source", "health_connect"))
                        ret.put("syncResult", syncObj)
                    }
                } catch (_: Exception) {
                    // Non-JSON or unexpected shape — native counts still returned.
                }

                hci(
                    "syncNow completed ok recentDataLikelyEmpty=$emptyIngestion " +
                        "stepsToday=$stepsOut dailyStepsTotal=$dailyStepsTotalInt dailyCount=${dailyStepsArr.length()} " +
                        "sleepSessions=$sleepSessionCount sleepTotalMin=$sleepTotalMinutes " +
                        "hrSamples=$heartRateSampleCount hrRecords=$heartRateRecordCount",
                )
                call.resolve(ret)
            } catch (e: Exception) {
                hce("syncNow failed", e)
                recordNativeError(e)
                call.reject("health_connect_sync_failed", e.message ?: "unknown", e)
            }
        }
    }

    private fun attachHcLauncherDiagnostics(
        ret: JSObject,
        ctx: Context,
        sdkDefault: Int,
        granted: Set<String>,
        missingJson: JSONArray,
    ) {
        val act = activity
        val o = JSObject()
        o.put("sdkStatus", sdkStatusLabel(sdkDefault))
        o.put("packageName", ctx.packageName)
        o.put("activityClass", act?.javaClass?.name ?: JSONObject.NULL)
        o.put("activityIsFragmentActivity", act is FragmentActivity)
        o.put("activityIsComponentActivity", act is ComponentActivity)
        o.put("launcherRegistered", HealthConnectPermissionBridge.isRegistered())
        o.put("lastPermissionLaunchMs", lastPermissionLaunchMs)
        o.put("lastPermissionCallbackMs", lastPermissionCallbackMs)
        o.put("launchCalled", lastPermissionLaunchMs > 0L)
        o.put("callbackFired", lastPermissionCallbackMs > 0L)
        val regErr = HealthConnectPermissionBridge.lastRegistrationError
        o.put("lastRegistrationError", regErr ?: JSONObject.NULL)
        val launchErr = HealthConnectPermissionBridge.lastLaunchError
        o.put("lastLaunchError", launchErr ?: JSONObject.NULL)
        if (lastNativeErrorBrief != null) {
            o.put("lastNativeError", lastNativeErrorBrief!!)
        } else {
            o.put("lastNativeError", JSONObject.NULL)
        }
        val gArr = JSONArray()
        granted.sorted().forEach { gArr.put(it) }
        o.put("grantedPermissions", gArr)
        o.put("missingPermissions", missingJson)
        ret.put("hcLauncherDiagnostics", o)
    }

    private fun putHcDiagnostics(
        ret: JSObject,
        ctx: Context,
        sdkDefault: Int,
        granted: Set<String>,
        missingJsonLen: Int,
    ) {
        if (!BuildConfig.HC_VERBOSE_LOG) return
        val diag = JSObject()
        try {
            val pm = ctx.packageManager
            val pInfo =
                if (Build.VERSION.SDK_INT >= 33) {
                    pm.getPackageInfo(ctx.packageName, PackageManager.PackageInfoFlags.of(0))
                } else {
                    @Suppress("DEPRECATION")
                    pm.getPackageInfo(ctx.packageName, 0)
                }
            diag.put("appVersionName", pInfo.versionName ?: JSONObject.NULL)
            val vc =
                if (Build.VERSION.SDK_INT >= 28) {
                    pInfo.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    pInfo.versionCode.toLong()
                }
            diag.put("appVersionCode", vc)
        } catch (t: Throwable) {
            recordNativeError(t)
            diag.put("appVersionName", JSONObject.NULL)
            diag.put("appVersionCode", JSONObject.NULL)
        }
        diag.put("packageName", ctx.packageName)
        diag.put("permissionLauncherRegistered", HealthConnectPermissionBridge.isRegistered())
        diag.put("lastPermissionLaunchMs", lastPermissionLaunchMs)
        diag.put("lastPermissionCallbackMs", lastPermissionCallbackMs)
        diag.put("sdkStatus", sdkStatusLabel(sdkDefault))
        diag.put("requiredPermissionsCount", requiredPermissions.size)
        diag.put("grantedPermissionsCount", granted.size)
        diag.put("grantedPermissionsSnapshot", granted.sorted().joinToString(","))
        diag.put("missingPermissionsCount", missingJsonLen)
        diag.put("launchCalled", lastPermissionLaunchMs > 0L)
        diag.put("callbackFired", lastPermissionCallbackMs > 0L)
        if (lastNativeErrorBrief != null) {
            diag.put("lastNativeError", lastNativeErrorBrief!!)
        } else {
            diag.put("lastNativeError", JSONObject.NULL)
        }
        ret.put("hcDiagnostics", diag)
    }

    /** Shallow recursive copy for `/api/health-connect/sync` dev diagnostics (no raw health samples). */
    private fun jsonObjectToJSObject(
        o: JSONObject,
        depth: Int = 0,
    ): JSObject {
        val out = JSObject()
        if (depth > 5) return out
        val it = o.keys()
        while (it.hasNext()) {
            val k = it.next()
            val v = o.get(k)
            when (v) {
                is JSONObject -> out.put(k, jsonObjectToJSObject(v, depth + 1))
                is JSONArray -> out.put(k, v.toString())
                is Boolean -> out.put(k, v)
                is Int -> out.put(k, v)
                is Long -> out.put(k, v)
                is Double -> out.put(k, v)
                is Float -> out.put(k, v.toDouble())
                is String -> out.put(k, v)
                JSONObject.NULL -> {
                    /* skip */
                }
                else -> out.put(k, v.toString())
            }
        }
        return out
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
