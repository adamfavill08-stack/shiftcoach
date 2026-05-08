# Health Connect — Play review and testing checklist

Use this after **Play Console → App content → Health apps** is **Completed / Approved**, and before wide release. ShiftCoach declares **read-only** access to **Steps**, **Sleep**, and **Heart rate** via Health Connect only (no Activity / Exercise / Nutrition / Weight HC types).

## Policy alignment (repo)

- **AndroidManifest.xml** (under `<manifest>`): `android.permission.health.READ_STEPS`, `READ_SLEEP`, `READ_HEART_RATE` only.
- **Kotlin** `ShiftCoachHealthConnectPlugin.kt`: `requiredPermissions` matches those three Jetpack `HealthPermission` reads.
- **User-facing copy**: wearables UI and privacy policy describe only steps, sleep, and heart rate for Health Connect; read-only, user-initiated, revocable; no advertising / no sale of HC data.

## Pre-flight

1. Wait until **Health apps** declaration status is **Approved** (or equivalent).
2. Upload a **new closed-testing** build if Play requires a fresh binary after approval.
3. Note **versionName** / **versionCode** in `android/app/build.gradle` and confirm they match the installed APK.

## ADB (Windows examples)

```bat
adb uninstall com.shiftcoach.app
adb shell am force-stop com.google.android.apps.healthdata
adb logcat -c
adb logcat | findstr ShiftCoachHC
adb shell dumpsys package com.shiftcoach.app | findstr /R "versionName versionCode health"
```

On macOS/Linux, replace `findstr` with `grep` as needed.

**Note:** Verbose `ShiftCoachHC` log lines are emitted on **debug** Android builds (`HC_VERBOSE_LOG=true`). Release Play builds set `HC_VERBOSE_LOG=false` (no noisy HC tag spam).

## Tester install

1. Install from the **closed testing** Play link (same Google account as tester).
2. Open the app and confirm **Settings → About** (or Play) shows the expected **version**.

## Health Connect flow

1. **ShiftCoach → Settings → Wearables** (or your navigation) → **Connect Health Connect** (or dev: **Refresh HC status** / **Request HC permissions** on non-production builds).
2. If Android shows the **in-app rationale** activity first, read it and tap **Continue**, then complete the system sheet.
3. Confirm the **Health Connect permission** UI lists **Steps**, **Sleep**, and **Heart rate** for ShiftCoach only.
4. Allow all three.
5. Open **Android Settings → Health Connect → App permissions** and confirm **ShiftCoach** appears under allowed access with those three types.

## Sync and writers

1. Tap **Sync** (or Connect flow until sync runs).
2. Confirm dashboard / APIs show **steps**, **sleep**, and **heart rate** where applicable.
3. If sync succeeds but **no data** appears, confirm **Samsung Health** or **Google Fit** (or your watch app) is allowed to **write** steps, sleep, and heart rate **into** Health Connect (ShiftCoach only reads the hub).

## Optional uninstall / HC reset for a clean re-test

- `adb uninstall com.shiftcoach.app` — full app data reset for permission flow.
- `adb shell am force-stop com.google.android.apps.healthdata` — bounce Health Connect if the sheet misbehaves during QA.

## Files to re-check when changing HC scope

- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/shiftcoach/app/ShiftCoachHealthConnectPlugin.kt`
- `android/app/src/main/java/com/shiftcoach/app/HealthConnectRationaleActivity.kt`
- `components/wearables/SyncWearableButton.tsx`
- `app/privacy-policy/page.tsx`
- Play Console **Health apps** declaration text (must stay in sync with the above).
