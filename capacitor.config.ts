import type { CapacitorConfig } from '@capacitor/cli';

// Chrome Mobile User-Agent so servers (Vercel/CDN) don't abort WebView connections (ERR_CONNECTION_ABORTED)
const CHROME_MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

/** Override both dev and prod targets, e.g. staging URL */
const explicitServerUrl = process.env.CAPACITOR_SERVER_URL;

/**
 * Live reload / emulator dev server only. Do not infer from NODE_ENV: `npx cap sync` is often run
 * with NODE_ENV unset, which previously baked http://10.0.2.2:3000 into android assets by mistake.
 */
const liveReload = process.env.CAPACITOR_LIVE_RELOAD === '1';

const hostedUrl = 'https://www.shiftcoach.app';
const emulatorDevUrl = 'http://10.0.2.2:3000';

const serverUrl = explicitServerUrl ?? (liveReload ? emulatorDevUrl : hostedUrl);

const config: CapacitorConfig = {
  appId: 'com.shiftcoach.app',
  appName: 'shiftcoach',
  webDir: 'public',
  /**
   * Default Capacitor Android bridge logs include full plugin `methodData` (would expose secrets).
   * Android: disable bridge/plugin payload logging; use `android.loggingBehavior: 'debug'` in
   * `capacitor.config.dev.ts` only when you intentionally need verbose bridge logs.
   */
  android: {
    overrideUserAgent: CHROME_MOBILE_UA,
    loggingBehavior: 'none',
  },
  /** Native defaults before JS runs — avoids transparent overlay + black bar from plugin init */
  plugins: {
    /**
     * Small icon: white-on-transparent PNGs in `android/app/src/main/res/drawable-*dpi/ic_notification.png`.
     * Matches Android notification asset rules (do not use launcher icon).
     */
    LocalNotifications: {
      smallIcon: 'ic_notification',
      /** ShiftCoach teal (same family as `ic_launcher_background` on Android). */
      iconColor: '#03B4C1',
    },
    /** Keep App plugin’s OnBackPressedCallback enabled so `App.addListener('backButton')` receives events. */
    App: {
      disableBackButtonHandler: false,
    },
    StatusBar: {
      overlaysWebView: false,
      /** Native default before JS; `NativeAndroidStatusBar` syncs to resolved theme. */
      style: 'LIGHT',
      backgroundColor: '#f5f3f0',
    },
  },
  server: {
    // Default: hosted site. Emulator live reload: CAPACITOR_LIVE_RELOAD=1 before cap sync, or CAPACITOR_SERVER_URL.
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  },
};

export default config;
