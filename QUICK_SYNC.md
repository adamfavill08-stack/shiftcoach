# Quick Sync Guide

## 🚀 Fastest Way to Sync to Android Studio

### Step 1: Build and Sync (in WSL)
```bash
cd /home/growli/shiftcali/shiftcali
npm run build
npx cap sync android
```

Or use the script:
```bash
./sync-to-android.sh
```

### Step 2: Open in Android Studio

**Recommended:** Use the WSL path directly
- **File → Open**
- Navigate to: `\\wsl.localhost\Ubuntu\home\growli\shiftcali\shiftcali\android`

**Alternative:** If you're using `C:\dev\shiftcoach\android`
- Make sure it's a copy or symlink of the WSL android folder
- **File → Open** → `C:\dev\shiftcoach\android`

### Step 3: Sync Gradle
- Click the **Sync** icon in Android Studio toolbar
- Or **File → Sync Project with Gradle Files**

---

## ✅ Verify It Worked

Check these files exist in Android Studio:
- `app/src/main/assets/public/` (your built web app)
- `app/src/main/assets/capacitor.config.json`

---

## 🔄 After Making Changes

Every time you make code changes:
1. Run `npm run build` in WSL
2. Run `npx cap sync android` in WSL
3. Sync Gradle in Android Studio

---

**That's it!** Your app should now be synced and ready to build. 🎉
