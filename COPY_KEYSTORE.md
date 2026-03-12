# Copy Keystore to Correct Location

## The Error
```
Keystore file 'C:\dev\shiftcoach\android\app\shiftcoach-upload.keystore' not found
```

## The Problem
The keystore file `shiftcoach-upload.keystore` exists, but it's not in the right location.

---

## Solution: Copy the Keystore File

### Step 1: Find Your Keystore File
You found it earlier - it's probably in:
- Downloads folder
- Documents folder
- Or wherever you saw it in the file explorer

### Step 2: Copy to Project Folder

**Copy the file to:**
```
C:\dev\shiftcoach\android\app\shiftcoach-upload.keystore
```

**How to copy:**
1. Find `shiftcoach-upload.keystore` in Windows Explorer
2. Right-click → **Copy**
3. Navigate to: `C:\dev\shiftcoach\android\app\`
4. Right-click → **Paste**

**Or drag and drop:**
1. Open two Windows Explorer windows
2. One showing where the keystore is
3. One showing `C:\dev\shiftcoach\android\app\`
4. Drag `shiftcoach-upload.keystore` from first to second

---

## Step 3: Verify File is There

Check that the file exists:
```
C:\dev\shiftcoach\android\app\shiftcoach-upload.keystore
```

File should be about 2-3 KB in size.

---

## Step 4: Build Again

After copying:
1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Click **Next**
4. **Key store path**: Should now find `shiftcoach-upload.keystore`
5. Enter passwords: `Rory0397`
6. **Key alias**: `shiftcoach`
7. Click **Next** → **Create**

---

## Quick Steps

1. **Copy** `shiftcoach-upload.keystore` 
2. **Paste** to `C:\dev\shiftcoach\android\app\`
3. **Build** AAB again in Android Studio

That's it! The build should work now.
