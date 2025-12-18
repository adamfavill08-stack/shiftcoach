import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shiftcoach.app',
  appName: 'shiftcoach-app',
  // For development, you can temporarily point to your local dev server.
  // For production (including Play Store builds), always point to your deployed URL.
  webDir: 'public',
  server: {
    // Use the live, deployed app – this is what real devices and Play Store builds will load.
    url: 'https://shiftcoach.app',
    cleartext: false, // Use HTTPS in production
  },
};

export default config;
