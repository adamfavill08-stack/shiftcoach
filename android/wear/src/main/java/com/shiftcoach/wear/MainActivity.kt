package com.shiftcoach.wear

import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.shiftcoach.wear.ui.ShiftCoachWearScreen

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.i(
            TAG,
            "MainActivity started url=${BuildConfig.API_BASE_URL} wearDevHeader=${BuildConfig.WEAR_DEV_KEY.isNotBlank()}",
        )
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContent {
            ShiftCoachWearScreen(apiBaseUrl = BuildConfig.API_BASE_URL, activity = this)
        }
    }

    private companion object {
        private const val TAG = "ShiftCoachWear"
    }
}
