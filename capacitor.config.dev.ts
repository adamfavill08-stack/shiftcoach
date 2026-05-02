import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Optional alternate config (e.g. `npx cap copy -c capacitor.config.dev.ts`).
 * Prefer `capacitor.config.ts` + CAPACITOR_LIVE_RELOAD=1 so prod syncs do not pick up dev URLs.
 */
const config: CapacitorConfig = {
  appId: 'com.shiftcoach.app',
  appName: 'shiftcoach',
  webDir: 'public',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#f5f3f0',
    },
  },
  server: {
    // Point to local dev server (must be running on port 3000)
    url: 'http://10.0.2.2:3000', // 10.0.2.2 is Android emulator's alias for localhost
    cleartext: true, // Allow HTTP for local development
  },
};

export default config;

