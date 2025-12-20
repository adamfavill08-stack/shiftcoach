# Google Play Console Upload Guide

## Setup Notes

**Your Environment:**
- Project builds in WSL: `/home/growli/shiftcali/shiftcali`
- Android Studio uses Windows path: `C:\dev\shiftcoach\android`
- Keystore should be at: `C:\dev\shiftcoach\android\app\shiftcoach-release.keystore`

## Prerequisites Checklist

Before uploading to Play Console, ensure you have:

- [ ] Google Play Console account set up
- [ ] App created in Play Console
- [ ] Keystore file created (`C:\dev\shiftcoach\android\app\shiftcoach-release.keystore`)
- [ ] `keystore.properties` configured at `C:\dev\shiftcoach\android\keystore.properties`
- [ ] App version code incremented (currently: 7)
- [ ] App version name set (currently: 1.0.5)

## Step 1: Create Keystore (If Not Done)

If you don't have a keystore yet, create one using Android Studio:

1. Open Android Studio
2. Open `C:\dev\shiftcoach\android` in Android Studio
3. Go to **Build** → **Generate Signed Bundle / APK**
4. Select **Android App Bundle**
5. Click **Create new...** under "Key store path"
6. Fill in:
   - **Key store path:** `C:\dev\shiftcoach\android\app\shiftcoach-release.keystore`
   - **Password:** (Choose strong password - **SAVE THIS!**)
   - **Key alias:** `shiftcoach`
   - **Key password:** (Can be same as keystore password)
   - **Validity:** 10000 (years)
   - **Certificate:** Your details
7. Click **OK**

## Step 2: Configure keystore.properties

Make sure `C:\dev\shiftcoach\android\keystore.properties` contains:

```properties
MYAPP_RELEASE_STORE_FILE=shiftcoach-release.keystore
MYAPP_RELEASE_STORE_PASSWORD=your-keystore-password
MYAPP_RELEASE_KEY_ALIAS=shiftcoach
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

⚠️ **IMPORTANT:** This file is gitignored - never commit it!

## Step 3: Build the Release AAB

### Recommended: Using WSL Script
Since you build in WSL, use the WSL build script:

```bash
# In WSL terminal
cd /home/growli/shiftcali/shiftcali
chmod +x build-android-release-wsl.sh
./build-android-release-wsl.sh
```

### Alternative: Manual Build Steps

**In WSL:**
```bash
# 1. Build Next.js (in WSL)
cd /home/growli/shiftcali/shiftcali
npm run build

# 2. Sync Capacitor (in WSL)
npx cap sync android

# 3. Build AAB (using Windows Android path via WSL)
cd /mnt/c/dev/shiftcoach/android
./gradlew bundleRelease
```

**Or from Windows PowerShell:**
```powershell
# 1. Build Next.js (via WSL)
wsl bash -c "cd /home/growli/shiftcali/shiftcali && npm run build"

# 2. Sync Capacitor (via WSL)
wsl bash -c "cd /home/growli/shiftcali/shiftcali && npx cap sync android"

# 3. Build AAB (in Windows)
cd C:\dev\shiftcoach\android
.\gradlew.bat bundleRelease
```

The signed AAB will be at:
`C:\dev\shiftcoach\android\app\build\outputs\bundle\release\app-release.aab`

## Step 4: Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Testing** → **Internal testing**
4. Click **Create new release**
5. Upload the AAB file: `C:\dev\shiftcoach\android\app\build\outputs\bundle\release\app-release.aab`
6. Fill in:
   - **Release name:** e.g., "1.0.5 - Internal Test"
   - **Release notes:** What's new in this version
7. Click **Save** then **Review release**
8. Review and click **Start rollout to Internal testing**

## Step 5: Add Testers (Internal Testing)

1. Go to **Testing** → **Internal testing** → **Testers** tab
2. Add email addresses of testers
3. Share the opt-in link with testers

## Version Management

**Current Version:**
- Version Code: `7` (increment for each upload)
- Version Name: `1.0.5`

**To update for next release:**
1. Edit `android/app/build.gradle`
2. Increment `versionCode` (must be higher than previous)
3. Update `versionName` (e.g., "1.0.6")

## Important Notes

⚠️ **CRITICAL:**
- **BACKUP** your keystore file securely
- **SAVE** passwords in a password manager
- If you lose the keystore, you **cannot** update your app on Play Store
- Never commit keystore files to git

✅ **Best Practices:**
- Test the AAB on a real device before uploading
- Use Internal testing first, then Closed testing, then Open testing
- Always increment version code for each upload
- Keep release notes clear and helpful

## Troubleshooting

**"Keystore file not found"**
- Make sure keystore is at `C:\dev\shiftcoach\android\app\shiftcoach-release.keystore`
- Check path in `C:\dev\shiftcoach\android\keystore.properties`
- If using WSL, ensure Windows paths are accessible via `/mnt/c/`

**"Wrong password"**
- Double-check passwords in `keystore.properties`
- No extra spaces in passwords

**"Version code already used"**
- Increment `versionCode` in `build.gradle`
- Must be higher than previous upload

**Build fails**
- Check Java/JDK is installed
- Ensure Android SDK is configured
- Check `local.properties` has `sdk.dir` set

