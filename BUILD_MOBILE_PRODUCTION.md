# Building for Mobile Production

## 🚀 Quick Start

### 1. Build Next.js Production Bundle

```bash
# Install dependencies (if needed)
npm install

# Build production bundle
npm run build
```

This creates an optimized production build in `.next/` directory.

### 2. Sync Capacitor

```bash
# Sync Android
npx cap sync android

# Sync iOS (if building for iOS)
npx cap sync ios
```

### 3. Build Android APK/AAB

**Option A: Using Android Studio (Recommended)**
1. Open Android Studio
2. Open the `android/` folder
3. Build → Generate Signed Bundle / APK
4. Select "Android App Bundle" (for Play Store) or "APK"
5. Use your release keystore (configured in `keystore.properties`)
6. Build and save the file

**Option B: Using Command Line**
```bash
cd android
./gradlew bundleRelease  # For AAB (Play Store)
# or
./gradlew assembleRelease  # For APK
```

The output will be in:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

### 4. Build iOS App

1. Open Xcode
2. Open `ios/App/App.xcworkspace`
3. Select your development team in Signing & Capabilities
4. Product → Archive
5. Distribute App → App Store Connect
6. Follow the upload wizard

---

## 📋 Pre-Build Checklist

### Android
- [x] Version code incremented in `android/app/build.gradle`
- [x] Version name updated
- [x] Keystore configured (`keystore.properties`)
- [x] ProGuard enabled (minification)
- [x] Production URL set in `capacitor.config.ts`
- [x] HTTPS enabled (`cleartext: false`)

### iOS
- [ ] Development team selected in Xcode
- [ ] Bundle identifier matches App Store Connect
- [ ] Version number matches App Store Connect
- [ ] Production URL set in `capacitor.config.ts`
- [ ] HTTPS enabled

### Code
- [x] All features tested
- [x] API routes working
- [x] Authentication working
- [x] Payments working (RevenueCat)
- [x] No console errors

---

## 🔧 Configuration Files

### Capacitor Config (`capacitor.config.ts`)
```typescript
{
  appId: 'com.shiftcoach.app',
  appName: 'shiftcoach-app',
  webDir: 'public',
  server: {
    url: 'https://www.shiftcoach.app',  // Production URL
    cleartext: false,  // HTTPS only
  },
}
```

### Android Build (`android/app/build.gradle`)
- Version Code: `7` (increment for each upload)
- Version Name: `1.0.5`
- Minify Enabled: `true` (ProGuard)
- Shrink Resources: `true`

---

## 📦 Bundle Sizes

### Expected Sizes (After Optimization)
- **JavaScript Bundle**: ~1-1.5 MB (minified)
- **Android APK**: ~10-15 MB (with ProGuard)
- **Android AAB**: ~8-12 MB (optimized for Play Store)
- **iOS App**: ~15-20 MB

---

## ⚠️ Important Notes

1. **Version Code**: Must increment for each Play Store upload
2. **Keystore**: Keep your keystore file safe - you'll need it for updates
3. **ProGuard**: Test thoroughly after enabling - some classes may need to be kept
4. **Production URL**: Make sure `https://www.shiftcoach.app` is deployed and accessible
5. **HTTPS**: Required for production - never use `cleartext: true` in production

---

## 🐛 Troubleshooting

### Build Fails
- Check `android/gradle.properties` for correct SDK versions
- Ensure Java 17+ is installed
- Clear Gradle cache: `./gradlew clean`

### App Crashes on Launch
- Check ProGuard rules - may need to keep more classes
- Check Logcat for errors
- Verify production URL is accessible

### Blank Screen
- Check Capacitor config URL
- Verify HTTPS certificate is valid
- Check network permissions in AndroidManifest.xml

---

## ✅ Ready for Production!

After building:
1. Test the APK/AAB on a real device
2. Verify all features work
3. Check performance
4. Upload to Play Store / App Store Connect

**Good luck with your launch!** 🚀
