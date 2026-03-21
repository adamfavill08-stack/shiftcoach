# Golden path: web + Android (Capacitor + Wear)

Use **one repo root** for everything. On Windows, that is `C:\dev\shiftcoach`. In WSL, use `/mnt/c/dev/shiftcoach` (same files).

## 1. Web app (Next.js)

From the **repository root** (where `package.json` has `"dev": "next dev"`):

```bash
npm install
npm run dev:android
```

- `dev:android` binds `0.0.0.0:3000` so the Android emulator can reach the host as `http://10.0.2.2:3000`.
- If you use port 3001, point the app URL there and ensure `next.config.ts` `allowedDevOrigins` includes that origin.

## 2. Sync into the native shell

From the same root:

```bash
npx cap sync android
```

Run this after changing web assets, Capacitor config, or plugins.

## 3. Android Studio

- Open the **`android/`** folder (not the repo root) as the Gradle project.
- Run the **phone** app module on a device or emulator.

## 4. Wear ↔ phone ↔ WebView

- Phone sends a Wear **Message** on path `/shiftcoach/ping`.
- Watch replies on `/shiftcoach/ack`. `PhoneWearListenerService` stores the ack timestamp and broadcasts to `MainActivity`.
- While the activity is in the foreground, `MainActivity` fires a Capacitor **`wearDataReceived`** event with JSON: `path`, `ts`, `raw`, `kind`.
- On resume, the phone still emits **`shiftcoach-watch-ack`** with `{ connected, ts }` derived from prefs (for any listeners still using it).

If the WebView was in the background when a message arrived, open the app again; prefs + `onResume` keep connection state consistent.

## 5. When to restart

- **Next.js**: after dependency or `next.config` changes; if the UI looks stale, delete `.next` and restart `npm run dev:android`.
- **Android**: after `npx cap sync android`, native Java/Kotlin changes, or manifest/service changes — rebuild/run from Android Studio.

---

## Smoke checklist (manual)

1. **Dev server**: `npm run dev:android` running; browser or emulator loads `/dashboard` without repeated `/_next` CORS warnings.
2. **Cap sync**: `npx cap sync android` completes with no errors.
3. **Wear path** (optional, with watch + phone paired): Logcat filter `ShiftCoachPhone` — ping sent, `Watch ACK received`, and (with app open) no crash on `wearDataReceived`.
4. **Sleep page**: open Sleep tab; `wearDataReceived` only triggers refresh when payload looks like sleep data (see `SleepPage.tsx`).
