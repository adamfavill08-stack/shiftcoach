# Upload APK/AAB to Google Play Console

**Goal**: Upload your first APK/AAB so you can create subscription products.

---

## Why You Need to Upload an APK First

- ✅ Google Play requires at least one APK/AAB before creating subscriptions
- ✅ You can upload a draft/test version (doesn't need to be published)
- ✅ You can upload to "Internal testing" track (not public)

---

## Step 1: Build Your Android App

### Option A: Build AAB (Recommended for Play Store)

1. **Build Next.js Production Bundle**
   ```bash
   cd /home/growli/shiftcali/shiftcali
   npm run build
   ```

2. **Sync Capacitor**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio**
   - Open Android Studio
   - **File → Open** → Select the `android` folder
   - Wait for Gradle sync to complete

4. **Generate Signed AAB**
   - **Build → Generate Signed Bundle / APK**
   - Select **Android App Bundle (AAB)**
   - Choose your keystore file (`shiftcoach-release.keystore`)
   - Enter keystore password
   - Select **release** build variant
   - Click **Next** → **Finish**
   - AAB file will be created in `android/app/release/`

### Option B: Build APK (For Testing)

1. **Build Next.js Production Bundle**
   ```bash
   cd /home/growli/shiftcali/shiftcali
   npm run build
   ```

2. **Sync Capacitor**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio**
   - Open Android Studio
   - **File → Open** → Select the `android` folder

4. **Build APK**
   - **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Wait for build to complete
   - APK will be in `android/app/build/outputs/apk/release/`

---

## Step 2: Upload to Google Play Console

1. **Go to Google Play Console**
   - https://play.google.com/console
   - Select your app: "Shift Coach"

2. **Go to Production or Internal Testing**
   - **Production** → **Create new release** (if you want to publish)
   - **Testing** → **Internal testing** → **Create new release** (recommended for first upload)

3. **Upload AAB/APK**
   - Click **"Upload"** or **"Create new release"**
   - Drag and drop your AAB/APK file
   - Or click **"Browse files"** and select it

4. **Release Name** (Optional)
   - Enter version name: e.g., "1.0.0" or "Initial release"
   - Add release notes (optional)

5. **Review and Rollout**
   - Review the release
   - Click **"Save"** (for draft) or **"Review release"** (to publish)
   - For Internal testing, you can publish immediately

---

## Step 3: Verify Upload

1. **Check Release Status**
   - Your release should show as "Published" (Internal testing) or "Draft" (Production)
   - Status may take a few minutes to update

2. **Go Back to Subscriptions**
   - Navigate to **Monetize → Products → Subscriptions**
   - You should now be able to create subscriptions!

---

## ⚠️ Important Notes

### Internal Testing vs Production
- **Internal testing**: Can publish immediately, only testers can access
- **Production**: Requires review, public release
- **For subscriptions setup**: Internal testing is fine!

### Version Code
- Each upload must have a higher version code
- Check `android/app/build.gradle` for current version
- Increment if needed: `versionCode 8` (or next number)

### Keystore
- You need a keystore file to sign the release build
- If you don't have one, create it:
  ```bash
  keytool -genkey -v -keystore shiftcoach-release.keystore -alias shiftcoach -keyalg RSA -keysize 2048 -validity 10000
  ```

### Testing
- After upload, you can test on devices
- Add testers in Internal testing track
- Test subscriptions with test accounts

---

## Quick Build Script

If you have the build script ready:

```bash
cd /home/growli/shiftcali/shiftcali
./build-android-release.sh
```

This should build and prepare your AAB for upload.

---

## ✅ Checklist

- [ ] Next.js app built (`npm run build`)
- [ ] Capacitor synced (`npx cap sync android`)
- [ ] Android Studio opened
- [ ] Signed AAB/APK generated
- [ ] AAB/APK uploaded to Google Play Console
- [ ] Release saved/published
- [ ] Can now access Subscriptions page

---

**Once uploaded, you can create your subscription products!** 🎉
