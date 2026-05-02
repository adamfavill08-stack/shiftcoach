package com.shiftcoach.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import com.google.android.gms.tasks.Tasks;
import com.google.android.gms.wearable.MessageClient;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "ShiftCoachPhone";

    /**
     * Cordova/Capacitor calls {@code window.Capacitor.triggerEvent} from native on pause/resume
     * ({@code MockCordovaWebViewImpl#triggerDocumentEvent}) with no guard. Chrome network error
     * pages ({@code chrome-error://chromewebdata/}) do not load the Capacitor bridge, which
     * produces "Cannot read properties of undefined (reading 'triggerEvent')". Inject a no-op
     * early on every navigation, including error interstitials.
     */
    private static final String CAPACITOR_TRIGGER_EVENT_SHIM_JS =
            "(function(){try{var c=window.Capacitor;if(!c){window.Capacitor={triggerEvent:function(){}};}"
                    + "else if(typeof c.triggerEvent!==\"function\"){c.triggerEvent=function(){};}}"
                    + "catch(e){}})()";

    private static final WebViewListener CAPACITOR_ERROR_PAGE_SHIM_LISTENER =
            new WebViewListener() {
                private void inject(WebView webView) {
                    if (webView != null) {
                        webView.evaluateJavascript(CAPACITOR_TRIGGER_EVENT_SHIM_JS, null);
                    }
                }

                @Override
                public void onPageStarted(WebView webView) {
                    inject(webView);
                }

                @Override
                public void onReceivedError(WebView webView) {
                    inject(webView);
                }
            };
    private static final String PING_PATH = "/shiftcoach/ping";
    private static final String PREFS = "shiftcoach_wear";
    private static final String KEY_LAST_ACK_TS = "watch_last_ack_ts";
    private static final long WATCH_CONNECTED_WINDOW_MS = 2 * 60 * 1000;

    /**
     * Capacitor's {@code Bridge.triggerJSEvent} evaluates {@code window.Capacitor.triggerEvent(...)}
     * immediately. During navigation or before the WebView runs the native bridge, {@code window.Capacitor}
     * can be missing and the console shows "Cannot read properties of undefined (reading 'triggerEvent')".
     * This wrapper no-ops until the bridge is ready.
     */
    private void triggerWindowJSEventWhenReady(String eventName, String dataExpression) {
        if (bridge == null) {
            return;
        }
        String escaped = eventName.replace("\\", "\\\\").replace("\"", "\\\"");
        String call =
                dataExpression == null
                        ? "c.triggerEvent(\"" + escaped + "\",\"window\")"
                        : "c.triggerEvent(\"" + escaped + "\",\"window\"," + dataExpression + ")";
        String js =
                "(function(){try{var c=window.Capacitor;if(!c||typeof c.triggerEvent!==\"function\")return;"
                        + call
                        + ";}catch(e){}})()";
        bridge.eval(js, null);
    }

    @Override
    protected void load() {
        bridgeBuilder.addWebViewListener(CAPACITOR_ERROR_PAGE_SHIM_LISTENER);
        super.load();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ShiftCoachHealthConnectPlugin.class);
        registerPlugin(ShiftCoachAppReviewPlugin.class);
        super.onCreate(savedInstanceState);
        // Keep content below status bar until Capacitor StatusBar runs (avoids transparent overlay defaults).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }

    /**
     * Persist WebView auth cookies to disk before backgrounding; otherwise sessions can look
     * "logged out" on next cold start (Capacitor / Chromium delay writing cookies).
     */
    @Override
    public void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }

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
                                    triggerWindowJSEventWhenReady("wearDataReceived", json);
                                }
                            });
                }
            };

    @Override
    public void onStart() {
        super.onStart();
        IntentFilter filter = new IntentFilter(WearBridgeBroadcast.ACTION);
        ContextCompat.registerReceiver(
                this,
                wearDataBridgeReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    public void onStop() {
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
        new Thread(
                        () -> {
                            try {
                                Thread.sleep(2000);
                            } catch (InterruptedException ignored) {}
                            runOnUiThread(MainActivity.this::emitWatchConnectionStatus);
                        })
                .start();
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
            triggerWindowJSEventWhenReady("shiftcoach-watch-ack", payload);
        }
    }
}
