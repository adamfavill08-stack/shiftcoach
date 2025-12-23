import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shiftcoach.app',
  appName: 'shiftcoach-app',
  webDir: 'public',
  server: {
    // For local testing: use 10.0.2.2:3000 (Android emulator's localhost)
    // For production/Play Store: use 'https://shiftcoach.app'
    url: process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000',
    cleartext: true, // Allow HTTP for localhost
  },
};

export default config;
