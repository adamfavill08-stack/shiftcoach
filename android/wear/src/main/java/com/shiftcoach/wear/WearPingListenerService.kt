package com.shiftcoach.wear

import android.util.Log
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import java.nio.charset.StandardCharsets

class WearPingListenerService : WearableListenerService() {
    override fun onMessageReceived(messageEvent: MessageEvent) {
        if (messageEvent.path != PING_PATH) {
            super.onMessageReceived(messageEvent)
            return
        }

        Log.d(TAG, "Phone ping received on watch")

        // Send a simple ACK back so both sides can verify direct channel.
        Thread {
            try {
                val payload = "watch_ack".toByteArray(StandardCharsets.UTF_8)
                Wearable.getMessageClient(this)
                    .sendMessage(messageEvent.sourceNodeId, ACK_PATH, payload)
                    .addOnFailureListener { e -> Log.w(TAG, "ACK send failed: ${e.message}", e) }
            } catch (e: Exception) {
                Log.w(TAG, "ACK thread failed: ${e.message}", e)
            }
        }.start()
    }

    companion object {
        private const val TAG = "ShiftCoachWear"
        private const val PING_PATH = "/shiftcoach/ping"
        private const val ACK_PATH = "/shiftcoach/ack"
    }
}
