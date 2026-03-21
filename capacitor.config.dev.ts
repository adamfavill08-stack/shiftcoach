import type { CapacitorConfig } from '@capacitor/cli';

// Development config - points to localhost
const config: CapacitorConfig = {
  appId: 'com.shiftcoach.app',
  appName: 'shiftcoach-app',
  webDir: 'public',
  server: {
    // Point to local dev server (must be running on port 3000)
    url: 'http://10.0.2.2:3000', // 10.0.2.2 is Android emulator's alias for localhost
    cleartext: true, // Allow HTTP for local development
  },
};

export default config;

