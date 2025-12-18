# Keystore Setup Guide

## Step 1: Generate the Keystore

You have **two options** to generate the keystore:

### Option A: Using Android Studio (Recommended - Easiest)

1. Open Android Studio
2. Open your project: `C:\dev\shiftcoach\android`
3. Go to **Build** → **Generate Signed Bundle / APK**
4. Select **Android App Bundle**
5. Click **Create new...** under "Key store path"
6. Fill in the form:
   - **Key store path:** `C:\dev\shiftcoach\android\app\shiftcoach-release.keystore`
   - **Password:** (Choose a strong password - **SAVE THIS!**)
   - **Key alias:** `shiftcoach`
   - **Key password:** (Can be same as keystore password)
   - **Validity:** 10000 (years)
   - **Certificate:** Fill in your details (name, organization, etc.)
7. Click **OK**
8. **IMPORTANT:** Save the passwords somewhere secure (password manager)

### Option B: Using Command Line (If you have JDK installed)

If you have Java JDK installed, you can use `keytool`:

```bash
# Navigate to android/app directory
cd C:\dev\shiftcoach\android\app

# Generate keystore
keytool -genkey -v -keystore shiftcoach-release.keystore -alias shiftcoach -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- Keystore password (choose a strong password - **SAVE THIS!**)
- Key password (can be same as keystore password)
- Your name, organization, etc.

---

## Step 2: Configure Gradle Properties

After generating the keystore, you need to add the signing configuration.

**IMPORTANT:** The `gradle.properties` file should NOT be committed to git with passwords.
We'll use a local file that's gitignored.

### Create `android/keystore.properties` (This file is gitignored)

Create a new file: `android/keystore.properties`

```properties
MYAPP_RELEASE_STORE_FILE=shiftcoach-release.keystore
MYAPP_RELEASE_STORE_PASSWORD=your-keystore-password-here
MYAPP_RELEASE_KEY_ALIAS=shiftcoach
MYAPP_RELEASE_KEY_PASSWORD=your-key-password-here
```

**Replace:**
- `your-keystore-password-here` with your actual keystore password
- `your-key-password-here` with your actual key password (can be same)

### Update `android/app/build.gradle` to load from keystore.properties

The build.gradle is already configured to read from these properties. We just need to make sure it loads from the local file.

---

## Step 3: Verify .gitignore

Make sure these files are NOT committed to git:

- `android/app/shiftcoach-release.keystore` (the keystore file)
- `android/keystore.properties` (the passwords file)

The `.gitignore` should already exclude `*.keystore` files.

---

## Step 4: Test the Build

After setup, test that signing works:

```bash
cd C:\dev\shiftcoach\android
.\gradlew bundleRelease
```

This should create a signed AAB file at:
`android/app/build/outputs/bundle/release/app-release.aab`

---

## Security Notes

⚠️ **CRITICAL:**
- **NEVER** commit the keystore file to git
- **NEVER** commit passwords to git
- **BACKUP** the keystore file securely (you'll need it for updates!)
- **SAVE** the passwords in a password manager
- If you lose the keystore, you **cannot** update your app on Play Store

---

## Troubleshooting

**"keytool not found"**
- Use Android Studio (Option A) instead
- Or install Java JDK and add it to PATH

**"Keystore file not found"**
- Make sure the keystore is in `android/app/` directory
- Check the path in `keystore.properties` is correct

**"Wrong password"**
- Double-check passwords in `keystore.properties`
- Make sure there are no extra spaces

