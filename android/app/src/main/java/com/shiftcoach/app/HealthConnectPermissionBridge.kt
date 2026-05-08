package com.shiftcoach.app

import androidx.activity.result.ActivityResultLauncher
import androidx.fragment.app.FragmentActivity
import androidx.health.connect.client.PermissionController

/**
 * Owns the Health Connect [ActivityResultLauncher] on [MainActivity] so registration happens in
 * [FragmentActivity.onCreate] lifecycle (reliable with Capacitor). The Capacitor plugin only calls
 * [launchHealthConnectPermissions] and receives results via [ShiftCoachHealthConnectPlugin.handleHcContractResult].
 */
object HealthConnectPermissionBridge {

    @Volatile
    private var launcher: ActivityResultLauncher<Set<String>>? = null

    @Volatile
    private var hostActivity: FragmentActivity? = null

    @Volatile
    var lastRegistrationError: String? = null
        private set

    @Volatile
    var lastLaunchError: String? = null
        private set

    @JvmStatic
    fun isRegistered(): Boolean = launcher != null

    /** Call once from [MainActivity.onCreate] immediately after [BridgeActivity.onCreate] super. */
    @Synchronized
    @JvmStatic
    fun registerWithMainActivity(activity: FragmentActivity) {
        lastRegistrationError = null
        if (BuildConfig.HC_VERBOSE_LOG) {
            android.util.Log.i("ShiftCoachHC", "HealthConnectPermissionBridge: registration started activityClass=${activity.javaClass.name}")
        }
        if (launcher != null && hostActivity === activity) {
            if (BuildConfig.HC_VERBOSE_LOG) {
                android.util.Log.i("ShiftCoachHC", "HealthConnectPermissionBridge: already registered for this activity instance")
            }
            return
        }
        launcher = null
        hostActivity = null
        try {
            val newLauncher =
                activity.registerForActivityResult(
                    PermissionController.createRequestPermissionResultContract(),
                ) { granted ->
                    if (BuildConfig.HC_VERBOSE_LOG) {
                        android.util.Log.i(
                            "ShiftCoachHC",
                            "callback fired contractGrantedSize=${granted.size} ids=${granted.joinToString(",")}",
                        )
                    }
                    ShiftCoachHealthConnectPlugin.handleHcContractResult(granted)
                }
            launcher = newLauncher
            hostActivity = activity
            if (BuildConfig.HC_VERBOSE_LOG) {
                android.util.Log.i("ShiftCoachHC", "HealthConnectPermissionBridge: registration succeeded")
            }
        } catch (t: Throwable) {
            lastRegistrationError =
                (t.javaClass.simpleName + ": " + (t.message ?: "") + "\n" + android.util.Log.getStackTraceString(t))
                    .take(8000)
            android.util.Log.e("ShiftCoachHC", "HealthConnectPermissionBridge: registration FAILED", t)
            launcher = null
            hostActivity = null
        }
    }

    /** Must run on the main thread. */
    @JvmStatic
    fun launchHealthConnectPermissions(permissions: Set<String>): Boolean {
        lastLaunchError = null
        val l = launcher
        if (l == null) {
            val msg = "launchHealthConnectPermissions: launcher is null (not registered)"
            android.util.Log.e("ShiftCoachHC", msg)
            lastLaunchError = msg
            return false
        }
        return try {
            if (BuildConfig.HC_VERBOSE_LOG) {
                android.util.Log.i(
                    "ShiftCoachHC",
                    "launch called permissionCount=${permissions.size} ids=${permissions.joinToString(",")}",
                )
            }
            l.launch(permissions)
            true
        } catch (t: Throwable) {
            lastLaunchError =
                (t.javaClass.simpleName + ": " + (t.message ?: "") + "\n" + android.util.Log.getStackTraceString(t))
                    .take(8000)
            android.util.Log.e("ShiftCoachHC", "launchHealthConnectPermissions FAILED", t)
            false
        }
    }
}
