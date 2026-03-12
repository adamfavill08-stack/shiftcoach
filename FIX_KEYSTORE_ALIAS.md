# Fix Keystore Alias Error

## The Error
```
No key with alias 'shiftcoach-key' found in keystore
```

## The Problem
The keystore file `shiftcoach-upload.keystore` doesn't have an alias called `shiftcoach-key`.

## Solution: Find the Correct Alias

### Option 1: Check What Aliases Are in the Keystore

Run this command to see what aliases exist:

```bash
# In WSL or Windows (if you have Java)
keytool -list -keystore shiftcoach-upload.keystore
```

Enter the keystore password when prompted (try `Rory0397`).

This will show you all aliases in the keystore.

### Option 2: Try Common Aliases

The keystore.properties shows `shiftcoach` as the alias. Try these:

1. **`shiftcoach`** (most likely - from keystore.properties)
2. **`upload`** (from filename)
3. **`release`**
4. **`android`**

---

## Fix: Update the Alias

### If Using Android Studio Dialog:

1. **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Click **Next**
4. **Key store path**: `C:\dev\shiftcoach\android\app\shiftcoach-upload.keystore`
5. **Key store password**: `Rory0397`
6. **Key alias**: Try `shiftcoach` (or whatever alias exists)
7. **Key password**: `Rory0397`
8. Click **Next**

### If Using keystore.properties:

The file already has:
```properties
MYAPP_RELEASE_KEY_ALIAS=shiftcoach
```

This should be correct. The error might be because:
- The alias in the keystore is different
- Or the keystore file path is wrong

---

## Quick Fix Steps

1. **Try alias `shiftcoach`** in Android Studio dialog
2. **If that doesn't work**, run `keytool -list` to see actual aliases
3. **Use the correct alias** that exists in the keystore

---

## Most Likely Solution

The alias is probably **`shiftcoach`** (from keystore.properties).

In Android Studio:
- When building, use alias: **`shiftcoach`** (not `shiftcoach-key`)
- Password: **`Rory0397`**

Try building again with alias `shiftcoach` instead of `shiftcoach-key`!
