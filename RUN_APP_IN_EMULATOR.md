# How to Run Your App in Android Studio Emulator

## 🚨 **Problem: Run Button is Grayed Out**

This usually means:
1. Emulator isn't recognized as a device
2. Capacitor project isn't synced
3. Next.js dev server isn't running

---

## ✅ **Step-by-Step Fix**

### **Step 1: Make Sure Emulator is Running**

1. **In Android Studio**, you should see "Pixel XL API 36.0" tab (you have this ✅)
2. **Make sure emulator is fully booted** (not still loading)
3. **Check**: You should see the Android home screen (you have this ✅)

### **Step 2: Start Your Next.js Dev Server**

**Open a terminal** (in your project root):

```bash
# Make sure you're in the project directory
cd ~/shiftcali/shiftcali

# Start the Next.js dev server
npm run dev
```

**Wait for it to start** - You should see:
```
✓ Ready in X.Xs
- Local:        http://localhost:3000
```

**Keep this terminal running!** Don't close it.

### **Step 3: Sync Capacitor**

**Open a NEW terminal** (keep the dev server running):

```bash
# Still in project root
cd ~/shiftcali/shiftcali

# Sync Capacitor (copies web files to Android project)
npx cap sync android
```

**Wait for it to finish** - You should see:
```
✔ Copying web assets from public to android/app/src/main/assets/public
✔ Copying native bridge
✔ Copying capacitor.config.json
✔ Syncing Android project
```

### **Step 4: Select the Emulator as Device**

**In Android Studio:**

1. **Look at the top toolbar** - Find the device dropdown (next to the run button)
2. **Click the dropdown** - You should see "Pixel XL API 36.0" listed
3. **Select "Pixel XL API 36.0"** - This tells Android Studio to use the emulator

**If you don't see the emulator in the dropdown:**
- Click the three dots (⋮) next to the device dropdown
- Select "Device Manager"
- Make sure your emulator is running
- Close Device Manager
- The emulator should now appear in the dropdown

### **Step 5: Run the App**

**Now the run button should be enabled!**

1. **Click the green "Run" button** (play icon) in the toolbar
2. **Or press**: `Shift+F10` (Windows) or `Ctrl+R` (Mac)

**The app should build and launch in the emulator!**

---

## 🔧 **Alternative: Run from Terminal**

If the run button is still grayed out, you can run from terminal:

```bash
# Make sure dev server is running (Step 2)
# Then in a new terminal:

cd ~/shiftcali/shiftcali

# Build and run on emulator
npx cap run android
```

This will:
1. Sync Capacitor
2. Build the Android app
3. Install it on the emulator
4. Launch it automatically

---

## 🐛 **Troubleshooting**

### **Problem: Still grayed out after all steps**

**Solution 1: Restart Android Studio**
1. Close Android Studio completely
2. Restart it
3. Open your project again
4. Wait for Gradle sync to finish
5. Try again

**Solution 2: Check Gradle Sync**
1. Look at the bottom of Android Studio
2. If you see "Gradle sync failed" or "Syncing..."
3. Wait for it to finish
4. If it failed, click "Sync Project with Gradle Files" (elephant icon)

**Solution 3: Check Device Connection**
1. In Android Studio, go to: **View → Tool Windows → Device Manager**
2. Make sure your emulator shows as "Running"
3. If not, click the play button to start it

**Solution 4: Use Terminal Method**
- Just use `npx cap run android` from terminal
- This bypasses Android Studio's run button entirely

---

## ✅ **Quick Checklist**

Before clicking Run:
- [ ] Next.js dev server is running (`npm run dev`)
- [ ] Capacitor is synced (`npx cap sync android`)
- [ ] Emulator is running and fully booted
- [ ] Emulator is selected in the device dropdown
- [ ] Gradle sync is complete (no errors at bottom)

---

## 🎯 **Recommended Workflow**

**Every time you want to run the app:**

1. **Terminal 1**: `npm run dev` (keep running)
2. **Terminal 2**: `npx cap sync android` (when you make changes)
3. **Android Studio**: Click Run button (or use `npx cap run android`)

**For screenshots:**
- Once the app is running in the emulator
- Navigate to the screen you want
- Click the camera icon (📷) in the emulator toolbar
- Screenshot saves automatically!

---

**Try these steps and let me know if the run button becomes enabled!** 🚀

