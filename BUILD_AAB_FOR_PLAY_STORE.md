# Build AAB for Play Store - Step by Step

## 🎯 Goal: Generate Signed Android App Bundle (.aab file)

---

## Step 1: Update Version (Important!)

**Before building, update version in `android/app/build.gradle`:**

1. Open `C:\dev\shiftcoach\android\app\build.gradle` in Android Studio
2. Find these lines (around line 18-19):
   ```gradle
   versionCode 7
   versionName "1.0.5"
   ```
3. **Increment versionCode** (required for each upload):
   ```gradle
   versionCode 8  // Must be higher than previous
   versionName "1.0.6"  // Update version name too
   ```
4. **Save** the file

---

## Step 2: Build Signed Bundle

### In Android Studio:

1. **Click Build** (top menu)
2. **Click Generate Signed Bundle / APK**
3. A dialog appears - select **Android App Bundle**
4. Click **Next**

---

## Step 3: Select Keystore

### If you have a keystore:

1. **Key store path**: Click folder icon
2. Navigate to: `C:\dev\shiftcoach\android\app\shiftcoach-release.keystore`
3. **Key store password**: Enter your password
4. **Key alias**: Enter your alias (or select from dropdown)
5. **Key password**: Enter your key password
6. Click **Next**

### If you DON'T have a keystore yet:

1. Click **Create new...**
2. Fill in:
   - **Key store path**: `C:\dev\shiftcoach\android\app\shiftcoach-release.keystore`
   - **Password**: Create a strong password (save it!)
   - **Confirm password**: Enter again
   - **Key alias**: `shiftcoach-key` (or your choice)
   - **Key password**: Create password (can be same as keystore)
   - **Validity**: 25 years (default is fine)
   - **Certificate info**: Fill in your details
3. Click **OK**
4. Click **Next**

---

## Step 4: Select Build Variant

1. **Build variant(s)**: Select **release** ✅
2. Make sure **release** is checked
3. Click **Create**

---

## Step 5: Wait for Build

- Android Studio will build the AAB
- Progress shown in bottom "Build" tab
- Wait for "BUILD SUCCESSFUL" message

---

## Step 6: Find Your AAB File

**Location**: 
```
C:\dev\shiftcoach\android\app\release\app-release.aab
```

**To find it:**
1. In Android Studio, click **Build → Analyze APK...**
2. Or navigate in Windows Explorer to: `C:\dev\shiftcoach\android\app\release\`
3. Look for `app-release.aab`

---

## Step 7: Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. **Testing → Closed testing** (or **Production** after approval)
4. **Create new release**
5. **Upload** the `app-release.aab` file
6. Fill in release notes
7. **Save** and **Review release**

---

## ⚠️ Important Notes

### Version Code Rules:
- **Must increment** for each upload
- **Must be unique** - can't reuse
- **Must be higher** than previous version
- Example: 7 → 8 → 9 → 10...

### Keystore Security:
- **Keep keystore file safe** - you'll need it for all updates
- **Don't lose the password** - you can't update the app without it
- **Backup the keystore** - store in safe place

### Build Location:
- AAB file is in: `android/app/release/app-release.aab`
- File size: Usually 10-20 MB
- Format: `.aab` (Android App Bundle)

---

## Quick Checklist

Before building:
- [ ] Version code incremented
- [ ] Version name updated
- [ ] Keystore ready (or create new one)
- [ ] App tested on emulator/device
- [ ] All features working

After building:
- [ ] AAB file created successfully
- [ ] File size looks reasonable (10-20 MB)
- [ ] Ready to upload to Play Console

---

## Troubleshooting

### "Keystore file not found"
- Create a new keystore (Step 3, "Create new...")
- Or check the path is correct

### "Build failed"
- Check for errors in Build output
- Make sure all dependencies are synced
- Try: **File → Sync Project with Gradle Files**

### "Version code already used"
- Increment versionCode in build.gradle
- Must be higher than previous upload

---

## That's It! 🎉

Your AAB file is ready to upload to Play Console!

**File location**: `C:\dev\shiftcoach\android\app\release\app-release.aab`
