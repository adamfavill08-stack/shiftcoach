package com.shiftcoach.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Shown when Health Connect requests [androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE]
 * before the system permission sheet. Must return [RESULT_OK] when the user continues.
 */
class HealthConnectRationaleActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (BuildConfig.HC_VERBOSE_LOG) {
            android.util.Log.i("ShiftCoachHC", "HealthConnectRationaleActivity onCreate")
        }
        setContentView(R.layout.activity_health_connect_rationale)

        findViewById<TextView>(R.id.hc_rationale_privacy_link).setOnClickListener {
            val url = getString(R.string.hc_privacy_policy_url)
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }

        findViewById<Button>(R.id.hc_rationale_continue).setOnClickListener {
            if (BuildConfig.HC_VERBOSE_LOG) {
                android.util.Log.i("ShiftCoachHC", "HealthConnectRationaleActivity Continue → RESULT_OK")
            }
            setResult(RESULT_OK)
            finish()
        }
    }
}
