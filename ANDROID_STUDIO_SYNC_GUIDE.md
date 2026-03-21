# Android Studio Sync Guide

## Current Setup

- **WSL Project Location**: `/home/growli/shiftcali/shiftcali`
- **Android Studio Location**: `C:\dev\shiftcoach\android`
- **Android Folder in WSL**: `/home/growli/shiftcali/shiftcali/android`

## The Issue

Android Studio is looking at `C:\dev\shiftcoach\android`, but your project is in WSL. You need to ensure these are synced.

## Solution Options

### Option 1: Use WSL Android Folder Directly (Recommended)

**Step 1: Open Android Studio**
1. Open Android Studio
2. **File → Open**
3. Navigate to: `\\wsl.localhost\Ubuntu\home\growli\shiftcali\shiftcali\android`
4. Click OK

**Step 2: Sync After Changes**
After making changes in WSL, run:
```bash
# In WSL terminal
cd /home/growli/shiftcali/shiftcali
npm run build
npx cap sync android
```

Then in Android Studio:
- **File → Sync Project with Gradle Files** (or click the sync icon)

### Option 2: Keep Using C:\dev\shiftcoach\android

If you want to keep using `C:\dev\shiftcoach\android`, you need to ensure it stays in sync:

**Step 1: Build and Sync in WSL**
```bash
# In WSL terminal
cd /home/growli/shiftcali/shiftcali

# Build Next.js
npm run build

# Sync Capacitor (this copies files to android folder)
npx cap sync android
```

**Step 2: Copy Android Folder to Windows (if needed)**
If `C:\dev\shiftcoach\android` is a separate copy, you may need to copy files:

```bash
# In WSL terminal
# Copy the entire android folder to Windows location
cp -r /home/growli/shiftcali/shiftcali/android /mnt/c/dev/shiftcoach/
```

**Step 3: Refresh in Android Studio**
- **File → Sync Project with Gradle Files**

### Option 3: Create Symlink (Advanced)

If `C:\dev\shiftcoach\android` should point to the WSL android folder:

**In Windows PowerShell (as Administrator):**
```powershell
# Remove existing folder if it exists
Remove-Item -Path "C:\dev\shiftcoach\android" -Recurse -Force -ErrorAction SilentlyContinue

# Create symlink to WSL folder
New-Item -ItemType SymbolicLink -Path "C:\dev\shiftcoach\android" -Target "\\wsl.localhost\Ubuntu\home\growli\shiftcali\shiftcali\android"
```

## Recommended Workflow

### For Development:

1. **Make changes in WSL** (your main project)
2. **Build and sync:**
   ```bash
   npm run build
   npx cap sync android
   ```
3. **Open Android Studio** pointing to the WSL android folder
4. **Build/run** in Android Studio

### For Production Build:

1. **Build in WSL:**
   ```bash
   npm run build
   npx cap sync android
   ```
2. **Open Android Studio** (pointing to correct android folder)
3. **Build → Generate Signed Bundle / APK**

## Verify Sync Worked

After running `npx cap sync android`, check:

1. **Web assets copied:**
   - `android/app/src/main/assets/public/` should have your built files
   - `android/app/src/main/assets/capacitor.config.json` should exist

2. **In Android Studio:**
   - Check that files are updated
   - Look for any sync errors

## Troubleshooting

### Android Studio shows old files:
- **File → Invalidate Caches / Restart**
- **File → Sync Project with Gradle Files**

### Changes not appearing:
- Make sure you ran `npm run build` first
- Then run `npx cap sync android`
- Refresh Android Studio

### Path not found:
- Verify the android folder exists: `ls -la /home/growli/shiftcali/shiftcali/android`
- Check Windows can access WSL: `\\wsl.localhost\Ubuntu\home\growli\shiftcali\shiftcali\android`

## Quick Sync Script

Use the provided script:
```bash
# In WSL
cd /home/growli/shiftcali/shiftcali
./sync-to-android.sh
```

This will:
1. Build Next.js
2. Sync Capacitor
3. Tell you where to open in Android Studio
