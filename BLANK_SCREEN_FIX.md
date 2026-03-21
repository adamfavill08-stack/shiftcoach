# Fixing Blank Screen in Android Studio

## The Problem

You're seeing a blank screen because the app is trying to load from `https://shiftcoach.app`, which might not be accessible or might not be working correctly.

## Solution Options

### Option 1: Use Local Dev Server (Recommended for Testing)

**Step 1: Start Next.js Dev Server**

In WSL terminal:
```bash
cd /home/growli/shiftcali/shiftcali
npm run dev
```

Keep this running! The server should be at `http://localhost:3000`

**Step 2: Update Capacitor Config for Local Dev**

Temporarily update `capacitor.config.ts`:

```typescript
server: {
  url: 'http://10.0.2.2:3000', // Android emulator's localhost
  cleartext: true,
},
```

**Step 3: Sync Capacitor**

```bash
npx cap sync android
```

**Step 4: Rebuild in Android Studio**

- Build → Rebuild Project
- Run the app again

### Option 2: Use Production URL (If Deployed)

If `https://shiftcoach.app` is deployed and working:

1. Make sure the site is accessible in a browser
2. Check Android Studio Logcat for network errors
3. Verify the URL in `android/app/src/main/assets/capacitor.config.json`

### Option 3: Check Network Permissions

Make sure Android has internet permission:

1. Check `android/app/src/main/AndroidManifest.xml`
2. Should have: `<uses-permission android:name="android.permission.INTERNET" />`

## Quick Fix Script

```bash
# In WSL
cd /home/growli/shiftcali/shiftcali

# 1. Start dev server (in one terminal)
npm run dev

# 2. In another terminal, update config and sync
# Edit capacitor.config.ts to use http://10.0.2.2:3000
npx cap sync android
```

## Debugging

**Check Logcat in Android Studio:**
1. View → Tool Windows → Logcat
2. Filter by "Capacitor" or "WebView"
3. Look for network errors or JavaScript errors

**Common Issues:**
- CORS errors → Make sure Next.js allows requests from the app
- Network unreachable → Check emulator can access internet
- SSL errors → Use `cleartext: true` for localhost

## For Play Store Builds

For production builds, keep the config pointing to `https://shiftcoach.app` - that's correct for the Play Store version.

