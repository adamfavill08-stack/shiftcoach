import type { CapacitorConfig } from '@capacitor/cli';

// Chrome Mobile User-Agent so servers (Vercel/CDN) don't abort WebView connections (ERR_CONNECTION_ABORTED)
const CHROME_MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

const explicitServerUrl = process.env.CAPACITOR_SERVER_URL
const isDev = process.env.NODE_ENV !== 'production'

const serverUrl =
  explicitServerUrl || (isDev ? 'http://10.0.2.2:3000' : 'https://www.shiftcoach.app')

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
    // In dev, point WebView at the local Next dev server.
    // In production, use the hosted HTTPS site.
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  },
  android: {
    // Avoid ERR_CONNECTION_ABORTED when loading https://www.shiftcoach.app in WebView
    overrideUserAgent: CHROME_MOBILE_UA,
  },
};

export default config;
