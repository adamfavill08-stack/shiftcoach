package com.shiftcoach.app

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.play.core.review.ReviewManagerFactory

/**
 * Exposes Google Play In-App Review to the Capacitor WebView (Android).
 * Parity with Flutter `in_app_review` for this project’s stack.
 */
@CapacitorPlugin(name = "ShiftCoachAppReview")
class ShiftCoachAppReviewPlugin : Plugin() {

    companion object {
        private const val TAG = "ShiftCoachAppReview"
    }

    @PluginMethod
    fun requestReview(call: PluginCall) {
        val act = activity
        if (act == null) {
            call.reject("no_activity", "Activity not available")
            return
        }

        val manager = ReviewManagerFactory.create(act)
        manager
            .requestReviewFlow()
            .addOnCompleteListener { requestTask ->
                if (!requestTask.isSuccessful) {
                    val ex = requestTask.exception
                    Log.w(TAG, "requestReviewFlow failed", ex)
                    call.reject(
                        "request_failed",
                        ex?.message ?: "Review flow request failed",
                        ex as? Exception,
                    )
                    return@addOnCompleteListener
                }

                val reviewInfo = requestTask.result
                manager
                    .launchReviewFlow(act, reviewInfo)
                    .addOnCompleteListener { launchTask ->
                        val ret = JSObject()
                        ret.put("requested", true)
                        ret.put("launchSuccess", launchTask.isSuccessful)
                        if (!launchTask.isSuccessful) {
                            Log.w(TAG, "launchReviewFlow failed", launchTask.exception)
                        }
                        call.resolve(ret)
                    }
            }
    }
}
