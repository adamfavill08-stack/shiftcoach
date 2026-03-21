package com.shiftcoach.app;

import android.content.Intent;
import android.util.Log;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;
import java.nio.charset.StandardCharsets;
import org.json.JSONException;
import org.json.JSONObject;

public class PhoneWearListenerService extends WearableListenerService {
    private static final String TAG = "ShiftCoachPhone";
    private static final String ACK_PATH = "/shiftcoach/ack";
    private static final String PREFS = "shiftcoach_wear";
    private static final String KEY_LAST_ACK_TS = "watch_last_ack_ts";

    @Override
    public void onMessageReceived(MessageEvent messageEvent) {
        if (!ACK_PATH.equals(messageEvent.getPath())) {
            super.onMessageReceived(messageEvent);
            return;
        }
        String payload = new String(messageEvent.getData(), StandardCharsets.UTF_8);
        Log.d(TAG, "Watch ACK received: " + payload);
        long now = System.currentTimeMillis();
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putLong(KEY_LAST_ACK_TS, now).apply();

        try {
            JSONObject meta = new JSONObject();
            meta.put("path", messageEvent.getPath());
            meta.put("ts", now);
            meta.put("raw", payload);
            meta.put("kind", "watch_message");

            Intent intent = new Intent(WearBridgeBroadcast.ACTION);
            intent.setPackage(getPackageName());
            intent.putExtra(WearBridgeBroadcast.EXTRA_JSON, meta.toString());
            sendBroadcast(intent);
        } catch (JSONException e) {
            Log.w(TAG, "wear bridge JSON", e);
        }
    }
}
