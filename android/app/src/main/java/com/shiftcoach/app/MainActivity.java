package com.shiftcoach.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.tasks.Tasks;
import com.google.android.gms.wearable.MessageClient;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "ShiftCoachPhone";
    private static final String PING_PATH = "/shiftcoach/ping";
    private static final String PREFS = "shiftcoach_wear";
    private static final String KEY_LAST_ACK_TS = "watch_last_ack_ts";
    private static final long WATCH_CONNECTED_WINDOW_MS = 2 * 60 * 1000;

    private final BroadcastReceiver wearDataBridgeReceiver =
            new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (!WearBridgeBroadcast.ACTION.equals(intent.getAction())) {
                        return;
                    }
                    String json = intent.getStringExtra(WearBridgeBroadcast.EXTRA_JSON);
                    if (json == null) {
                        return;
                    }
                    runOnUiThread(
                            () -> {
                                if (bridge != null) {
                                    bridge.triggerJSEvent("wearDataReceived", "window", json);
                                }
                            });
                }
            };

    @Override
    protected void onStart() {
        super.onStart();
        IntentFilter filter = new IntentFilter(WearBridgeBroadcast.ACTION);
        ContextCompat.registerReceiver(
                this,
                wearDataBridgeReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void onStop() {
        try {
            unregisterReceiver(wearDataBridgeReceiver);
        } catch (IllegalArgumentException ignored) {
            // Receiver was not registered
        }
        super.onStop();
    }

    @Override
    public void onResume() {
        super.onResume();
        emitWatchConnectionStatus();
        sendPingToWatch();
        new Thread(() -> {
            try {
                Thread.sleep(2000);
            } catch (InterruptedException ignored) {}
            runOnUiThread(this::emitWatchConnectionStatus);
        }).start();
    }

    private void sendPingToWatch() {
        new Thread(() -> {
            try {
                List<Node> nodes = Tasks.await(Wearable.getNodeClient(this).getConnectedNodes());
                MessageClient messageClient = Wearable.getMessageClient(this);
                byte[] payload = "phone_ping".getBytes(StandardCharsets.UTF_8);
                for (Node node : nodes) {
                    Tasks.await(messageClient.sendMessage(node.getId(), PING_PATH, payload));
                    android.util.Log.d(TAG, "Ping sent to watch node: " + node.getDisplayName());
                }
            } catch (Exception e) {
                android.util.Log.w(TAG, "Watch ping failed: " + e.getMessage(), e);
            }
        }).start();
    }

    private void emitWatchConnectionStatus() {
        long ts = getSharedPreferences(PREFS, MODE_PRIVATE).getLong(KEY_LAST_ACK_TS, 0L);
        boolean connected = (System.currentTimeMillis() - ts) <= WATCH_CONNECTED_WINDOW_MS;
        if (bridge != null) {
            String payload = "{\"connected\":" + connected + ",\"ts\":" + ts + "}";
            bridge.triggerJSEvent("shiftcoach-watch-ack", "window", payload);
        }
    }
}
