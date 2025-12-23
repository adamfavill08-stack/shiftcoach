# How to Sync Your Project to Android Studio

Since you're working in WSL but Android Studio uses `C:\dev\shiftcoach\android`, here's how to sync everything:

## Step 1: Build Next.js (in WSL)

First, build your Next.js app to generate the production files:

```bash
# In WSL terminal
cd /home/growli/shiftcali/shiftcali
npm run build
```

This creates the optimized production build in the `public` folder (or `.next` output that Capacitor will use).

## Step 2: Sync Capacitor (in WSL)

Sync Capacitor to copy web assets to the Android folder:

```bash
# Still in WSL, same directory
npx cap sync android
```

This will:
- Copy web assets from `public` to `android/app/src/main/assets/public`
- Copy `capacitor.config.json` to Android
- Update Android project files

## Step 3: Verify Android Folder Location

**Option A: If Android folder is in WSL project**
- The Android folder should be at: `/home/growli/shiftcali/shiftcali/android`
- Windows can access it at: `\\wsl.localhost\Ubuntu\home\growli\shiftcali\shiftcali\android`
- Or map it to: `C:\dev\shiftcoach\android`

**Option B: If Android folder is separate on Windows**
- Make sure `C:\dev\shiftcoach\android` exists
- You may need to copy or symlink the Android folder

## Step 4: Open in Android Studio

1. **Open Android Studio**
2. **File → Open**
3. **Navigate to:** `C:\dev\shiftcoach\android`
4. **Click OK**

Android Studio will:
- Sync Gradle files
- Download dependencies
- Index the project

## Step 5: Verify Sync Worked

Check that files were copied:
- `C:\dev\shiftcoach\android\app\src\main\assets\public\` should contain your web files
- `C:\dev\shiftcoach\android\app\src\main\assets\capacitor.config.json` should exist

## Troubleshooting

**If Android folder is not at C:\dev\shiftcoach\android:**

1. **Check where it actually is:**
   ```bash
   # In WSL
   ls -la /home/growli/shiftcali/shiftcali/android
   ```

2. **If it's in WSL, you can:**
   - Access it via `\\wsl.localhost\Ubuntu\home\growli\shiftcali\shiftcali\android` in Windows
   - Or create a symlink/junction in Windows to `C:\dev\shiftcoach\android`

3. **Or move/copy it:**
   ```bash
   # In WSL - copy to Windows location
   cp -r /home/growli/shiftcali/shiftcali/android /mnt/c/dev/shiftcoach/
   ```

**If Capacitor sync fails:**
- Make sure you've run `npm run build` first
- Check that `public` folder exists
- Verify `capacitor.config.ts` is correct

## Quick Sync Script

You can create a quick sync script:

```bash
# In WSL
cd /home/growli/shiftcali/shiftcali
npm run build && npx cap sync android
```

This builds and syncs in one command.

