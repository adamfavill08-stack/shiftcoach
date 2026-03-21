# Use Found Keystore - shiftcoach-upload.keystore

## ✅ Found Your Keystore!

You found: `shiftcoach-upload.keystore` (modified 15/12/2025)

This is likely the original keystore that matches Google Play's expected fingerprint!

---

## Step 1: Verify the Keystore (Optional but Recommended)

Check if this keystore matches the expected fingerprint:

```bash
# In WSL or Windows (if you have Java)
keytool -list -v -keystore shiftcoach-upload.keystore
```

Look for SHA1 fingerprint - should match:
`FE:90:91:A3:D9:5A:F8:2A:E1:21:4E:B3:28:7E:91:35:84:9A:6C:9B`

---

## Step 2: Copy Keystore to Project

1. **Copy the keystore** to your Android project:
   ```
   From: (wherever it is now)
   To: C:\dev\shiftcoach\android\app\shiftcoach-upload.keystore
   ```

2. **Or use it from current location** (if it's accessible)

---

## Step 3: Update keystore.properties

Update `C:\dev\shiftcoach\android\keystore.properties`:

```properties
MYAPP_RELEASE_STORE_FILE=shiftcoach-upload.keystore
MYAPP_RELEASE_STORE_PASSWORD=[your password]
MYAPP_RELEASE_KEY_ALIAS=[your alias - check if you know it]
MYAPP_RELEASE_KEY_PASSWORD=[your password]
```

**If you don't know the passwords:**
- Check if you saved them anywhere
- Check password manager
- Check notes/documentation

---

## Step 4: Build AAB with This Keystore

### Option A: Using Android Studio
1. **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Click **Next**
4. **Key store path**: Browse to `shiftcoach-upload.keystore`
5. Enter **passwords** (keystore password and key password)
6. **Key alias**: Enter the alias (might be `shiftcoach` or similar)
7. Click **Next**
8. Select **release** build variant
9. Click **Create**

### Option B: Using Gradle (If keystore.properties is set up)
```bash
cd C:\dev\shiftcoach\android
.\gradlew bundleRelease
```

---

## Step 5: Verify the AAB

After building, the AAB should be signed with the correct key and should upload to Play Console successfully!

---

## If You Don't Know the Passwords

**Try these:**
1. Check `keystore.properties` - might have old passwords
2. Check password manager
3. Check any notes/documentation
4. Common passwords you might have used

**If you can't remember:**
- You'll need to create a new app listing (unfortunate, but necessary)
- Or check if Google Play App Signing can help

---

## Quick Steps

1. **Copy keystore** to: `C:\dev\shiftcoach\android\app\shiftcoach-upload.keystore`
2. **Update keystore.properties** with correct file name and passwords
3. **Build AAB** using this keystore
4. **Upload to Play Console** - should work now!

---

## Success! 🎉

Once you use this keystore, your AAB should upload successfully to Play Console!
