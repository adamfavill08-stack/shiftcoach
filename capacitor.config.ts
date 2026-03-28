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
  /** Native defaults before JS runs — avoids transparent overlay + black bar from plugin init */
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
  },
  server: {
    // Default: hosted site. Emulator live reload: CAPACITOR_LIVE_RELOAD=1 before cap sync, or CAPACITOR_SERVER_URL.
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  },
  android: {
    // Avoid ERR_CONNECTION_ABORTED when loading https://www.shiftcoach.app in WebView
    overrideUserAgent: CHROME_MOBILE_UA,
  },
};

export default config;
