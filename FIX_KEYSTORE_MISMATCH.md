# Fix Keystore Mismatch Error

## The Problem

Google Play Console expects:
- SHA1: `FE:90:91:A3:D9:5A:F8:2A:E1:21:4E:B3:28:7E:91:35:84:9A:6C:9B`

But your new keystore has:
- SHA1: `ED:36:FD:1D:16:5C:D7:3B:AA:71:85:A1:D5:2C:71:8D:2C:A0:86:43`

**This means you previously uploaded an app with a different keystore!**

---

## Solution Options

### Option 1: Find Your Original Keystore (Best) ✅

You need to find the keystore file that was used for the first upload.

**Where to look:**
1. Check your computer for keystore files:
   - Search for `*.keystore` files
   - Check: `C:\dev\shiftcoach\android\app\`
   - Check: `C:\Users\YourUsername\.android\`
   - Check: `C:\dev\shiftcoach\android\`
   - Check any backup locations

2. **Check if you saved keystore info:**
   - Look for notes/files with keystore passwords
   - Check `keystore.properties` file
   - Check any documentation you created

3. **If you find it:**
   - Use that keystore to sign your new AAB
   - Don't create a new one!

---

### Option 2: Check if This is a New App Listing

**If this is your FIRST upload to this app listing:**
- You might have accidentally created a new keystore
- Delete the new keystore you just created
- Check if there's an existing one you should use

**If you're updating an existing app:**
- You MUST use the original keystore
- Google Play won't accept updates signed with a different key

---

### Option 3: If You Lost the Original Keystore ⚠️

**Bad news:** If you can't find the original keystore:
- You **cannot update** the existing app listing
- You'll need to create a **new app listing** in Play Console
- You'll lose all downloads, reviews, and ratings from the old listing

**This is why keystore security is critical!**

---

## How to Find Your Keystore

### Check Common Locations:

1. **In your project:**
   ```bash
   # In WSL
   find /mnt/c/dev/shiftcoach -name "*.keystore"
   ```

2. **In Android Studio:**
   - Check if there's a keystore referenced in `build.gradle`
   - Check `keystore.properties` file

3. **Search Windows:**
   - Windows Search: `*.keystore`
   - Check Downloads folder
   - Check Documents folder

---

## How to Verify Keystore Fingerprint

If you find a keystore, verify it matches:

```bash
# In WSL or Windows (if you have Java)
keytool -list -v -keystore path/to/keystore.keystore

# Look for SHA1 fingerprint
# Should match: FE:90:91:A3:D9:5A:F8:2A:E1:21:4E:B3:28:7E:91:35:84:9A:6C:9B
```

---

## Next Steps

1. **Search for existing keystore files**
2. **Check if you have keystore passwords saved**
3. **If found:** Use that keystore to sign your AAB
4. **If not found:** You may need to create a new app listing

---

## Prevention for Future

- ✅ **Backup keystore file** to safe location
- ✅ **Save passwords** in password manager
- ✅ **Document keystore location** in secure notes
- ✅ **Never delete** the keystore file

---

## Quick Checklist

- [ ] Search for `*.keystore` files on your computer
- [ ] Check `keystore.properties` file
- [ ] Check any notes/documentation
- [ ] Check backup locations (cloud, USB, etc.)
- [ ] If found: Use that keystore
- [ ] If not found: Consider creating new app listing
