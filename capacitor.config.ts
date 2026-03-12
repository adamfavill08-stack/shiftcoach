import type { CapacitorConfig } from '@capacitor/cli';

// Chrome Mobile User-Agent so servers (Vercel/CDN) don't abort WebView connections (ERR_CONNECTION_ABORTED)
const CHROME_MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

const config: CapacitorConfig = {
  appId: 'com.shiftcoach.app',
  appName: 'shiftcoach-app',
  webDir: 'public',
  server: {
    // For local testing: use 10.0.2.2:3000 (Android emulator's localhost)
    // For production/Play Store: use 'https://www.shiftcoach.app'
    url: process.env.CAPACITOR_SERVER_URL || 'https://www.shiftcoach.app',
    cleartext: false, // HTTPS for production
  },
  android: {
    // Avoid ERR_CONNECTION_ABORTED when loading https://www.shiftcoach.app in WebView
    overrideUserAgent: CHROME_MOBILE_UA,
  },
};

export default config;
