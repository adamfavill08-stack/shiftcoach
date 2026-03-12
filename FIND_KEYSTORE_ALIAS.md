# Find the Correct Keystore Alias

## The Error
```
No key with alias 'shiftcoach' found in keystore shiftcoach-upload.keystore
```

## The Problem
The keystore file exists, but the alias inside it is NOT `shiftcoach`.

---

## Solution: Find the Actual Alias

### Step 1: List Aliases in the Keystore

Run this command to see what aliases are in the keystore:

**In Windows (PowerShell or Command Prompt):**
```powershell
keytool -list -keystore C:\dev\shiftcoach\android\app\shiftcoach-upload.keystore
```

**Or in WSL:**
```bash
keytool -list -keystore /mnt/c/dev/shiftcoach/android/app/shiftcoach-upload.keystore
```

**When prompted, enter password:** `Rory0397`

**Output will show:**
```
Keystore type: JKS
Keystore provider: SUN

Your keystore contains 1 entry

[ALIAS_NAME], Dec 15, 2025, PrivateKeyEntry,
Certificate fingerprint (SHA1): FE:90:91:A3:D9:5A:F8:2A:E1:21:4E:B3:28:7E:91:35:84:9A:6C:9B
```

**The `[ALIAS_NAME]` is what you need!**

---

## Step 2: Use the Correct Alias

Once you know the actual alias:

### Option A: Update keystore.properties
Update `C:\dev\shiftcoach\android\keystore.properties`:
```properties
MYAPP_RELEASE_KEY_ALIAS=[the actual alias from step 1]
```

### Option B: Use in Android Studio Dialog
When building:
- **Key alias**: Enter the actual alias (not `shiftcoach`)

---

## Common Aliases to Try

If you can't run keytool, try these common aliases:
1. **`upload`** (from filename `shiftcoach-upload.keystore`)
2. **`release`**
3. **`android`**
4. **`key`**
5. **`shiftcoach-upload`**

---

## Quick Fix

1. **Run keytool command** to list aliases
2. **Note the alias name** from output
3. **Update keystore.properties** with correct alias
4. **Or use correct alias** in Android Studio dialog
5. **Build again**

---

## If You Can't Run keytool

Try building in Android Studio with different aliases:
- Try `upload` first (most likely from filename)
- If that doesn't work, try `release`, `android`, `key`

The alias is probably **`upload`** based on the filename!
