#!/bin/bash
# Build script for Android Play Store release
# This builds a signed Android App Bundle (AAB) for Google Play Console

set -e  # Exit on error

echo "🚀 Building ShiftCoach for Play Store..."

# Step 1: Build Next.js for production
echo "📦 Step 1: Building Next.js production bundle..."
npm run build

# Step 2: Sync Capacitor
echo "🔄 Step 2: Syncing Capacitor..."
npx cap sync android

# Step 3: Build signed AAB
echo "🔨 Step 3: Building signed Android App Bundle..."
cd android

# Check if keystore exists
if [ ! -f "app/shiftcoach-release.keystore" ]; then
    echo "❌ ERROR: Keystore file not found!"
    echo ""
    echo "You need to create a keystore first. Options:"
    echo ""
    echo "Option 1: Use Android Studio"
    echo "  1. Open android/ in Android Studio"
    echo "  2. Build → Generate Signed Bundle / APK"
    echo "  3. Create new keystore at: android/app/shiftcoach-release.keystore"
    echo ""
    echo "Option 2: Use keytool (if Java JDK installed)"
    echo "  cd android/app"
    echo "  keytool -genkey -v -keystore shiftcoach-release.keystore -alias shiftcoach -keyalg RSA -keysize 2048 -validity 10000"
    echo ""
    echo "Then update android/keystore.properties with your passwords."
    exit 1
fi

# Check if keystore.properties exists
if [ ! -f "keystore.properties" ]; then
    echo "❌ ERROR: keystore.properties not found!"
    echo "Create android/keystore.properties with:"
    echo "  MYAPP_RELEASE_STORE_FILE=shiftcoach-release.keystore"
    echo "  MYAPP_RELEASE_STORE_PASSWORD=your-password"
    echo "  MYAPP_RELEASE_KEY_ALIAS=shiftcoach"
    echo "  MYAPP_RELEASE_KEY_PASSWORD=your-password"
    exit 1
fi

# Build the AAB
./gradlew bundleRelease

# Check if build succeeded
if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
    echo ""
    echo "✅ SUCCESS! Signed AAB created:"
    echo "   android/app/build/outputs/bundle/release/app-release.aab"
    echo ""
    echo "📤 Next steps:"
    echo "  1. Go to Google Play Console"
    echo "  2. Select your app → Internal testing → Create new release"
    echo "  3. Upload the AAB file"
    echo "  4. Fill in release notes and submit"
    echo ""
else
    echo "❌ ERROR: AAB file not found. Check build errors above."
    exit 1
fi

