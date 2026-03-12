# Fix Gradle Sync Error

## The Error
```
Please ensure Android Studio can write to the specified Gradle wrapper distribution directory.
```

## Quick Fix

### Option 1: Change Gradle Home Directory (Easiest)

1. **File → Settings → Build Tools → Gradle**
2. Find **"Gradle user home:"** field
3. Change it to a Windows path that Android Studio can write to:
   ```
   C:\Users\YourUsername\.gradle
   ```
   (Replace `YourUsername` with your Windows username)
4. Click **Apply** and **OK**
5. **File → Sync Project with Gradle Files**

### Option 2: Fix Permissions on Current Gradle Directory

1. Right-click the `android` folder: `C:\dev\shiftcoach\android`
2. **Properties → Security**
3. Make sure your user has **Full Control**
4. Click **Apply** to all subfolders
5. **File → Sync Project with Gradle Files**

### Option 3: Use Default Gradle Location

1. **File → Settings → Build Tools → Gradle**
2. Find **"Gradle user home:"**
3. Clear the field (leave it empty)
4. This will use the default: `C:\Users\YourUsername\.gradle`
5. Click **Apply** and **OK**
6. **File → Sync Project with Gradle Files**

## After Fixing

Once Gradle sync succeeds:
- The Run button should become active
- You can run the app on the emulator

Try **Option 3** first (clearing the Gradle home field) - it's the simplest!
