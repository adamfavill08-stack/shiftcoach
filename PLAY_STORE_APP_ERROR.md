# Error When Opening the App (Play Store / Closed Testing)

If you see an error when you open the app after installing from Google Play (closed testing), follow these steps to identify and fix it.

## 1. Get the exact error

- **What does the screen show?**  
  - “Webpage not available” / “This site can’t be reached” → the app couldn’t load the server (see **2**).  
  - “Something went wrong” with a **Try again** button → the app loaded but hit an error (see **3**).  
  - Any other text (e.g. “Configuration error”, “Network error”, “Unable to verify subscription”) → note the **exact wording** and, if possible, take a **screenshot**.

- **Check in a browser:**  
  On the same phone (Wi‑Fi or mobile data), open Chrome and go to:  
  **https://www.shiftcoach.app**  
  - If this page **does not load** or shows an error → the problem is network or the server, not only the app (see **2**).  
  - If it **loads fine** → the issue is likely inside the app (see **3**).

## 2. “Webpage not available” / “This site can’t be reached”

The app is a WebView that loads **https://www.shiftcoach.app**. If that URL doesn’t load:

- **User-Agent fix (for net::ERR_CONNECTION_ABORTED):** The app is configured to send a Chrome Mobile User-Agent so the server (e.g. Vercel/CDN) doesn't close the connection (`capacitor.config.ts` → `android.overrideUserAgent`). **Rebuild the Android app and upload a new AAB/APK to Play** for this to take effect.
- **Check internet:** Wi‑Fi or mobile data on, try another network.
- **Check the URL:**  
  In the project, the app is configured to load `https://www.shiftcoach.app` (see `capacitor.config.ts` → `server.url`).  
  If your production URL is different, set `CAPACITOR_SERVER_URL` when building the Android app and rebuild.
- **Check the server:**  
  Ensure https://www.shiftcoach.app is deployed, up, and returning 200 (e.g. from Vercel or your host).  
  Fix any SSL or domain errors on the server side.

## 3. In‑app error (“Something went wrong”, “Configuration error”, etc.)

- **Try again:**  
  Use the **Try again** button if you see “Something went wrong”.  
  If it keeps happening, force‑close the app and open it again; then try on a different network.

- **“Configuration error” / “Supabase URL is missing”:**  
  The **production** site (https://www.shiftcoach.app) must be built with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
  Set these in your host’s environment (e.g. Vercel) and **redeploy** so the WebView gets the correct build.

- **“Network error” / “Unable to verify subscription”:**  
  Usually connectivity or the backend being unreachable.  
  Check that the device can reach https://www.shiftcoach.app and that your API (e.g. Vercel) and Supabase are up and reachable.

## 4. Developer: see the real error (optional)

- **Chrome remote debugging (WebView):**  
  1. On the phone: Settings → Developer options → enable **USB debugging**.  
  2. Connect via USB, allow debugging.  
  3. On desktop Chrome: open `chrome://inspect`, find your app’s WebView, click **inspect**.  
  4. In the Console tab, look for red errors when you open the app; that’s the real JS error.

- **Logcat (Android):**  
  Run:  
  `adb logcat | findstr -i "shiftcoach\|capacitor\|chromium\|WebView"`  
  (or grep equivalent on Mac/Linux).  
  Reproduce the error and check the logs for stack traces or “Error”/“Exception”.

## Summary

| What you see | What to do |
|--------------|------------|
| “Webpage not available” | Check internet, check https://www.shiftcoach.app in browser, fix server/URL if needed |
| “Something went wrong” + Try again | Use Try again; check network; if it persists, use Chrome inspect or logcat to get the real error |
| “Configuration error” / “Supabase” | Set `NEXT_PUBLIC_SUPABASE_*` in production and redeploy |
| Other message | Note exact text + screenshot; check Console (Chrome inspect) or logcat for the underlying error |

The app now has a root **error boundary** (`app/error.tsx`): when something goes wrong after the page loads, users see “Something went wrong” and a **Try again** button instead of a blank screen.
