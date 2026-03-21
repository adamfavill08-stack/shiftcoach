package com.shiftcoach.app;

/**
 * Delivers Wear message payloads from {@link PhoneWearListenerService} to {@link MainActivity}
 * so the Capacitor WebView can receive {@code wearDataReceived} while the activity is in the foreground.
 */
public final class WearBridgeBroadcast {
    public static final String ACTION = "com.shiftcoach.app.WEAR_DATA_BRIDGE";
    public static final String EXTRA_JSON = "json";

    private WearBridgeBroadcast() {}
}
