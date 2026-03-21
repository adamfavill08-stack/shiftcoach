#!/bin/bash
# Build script for Android Play Store release (WSL version)
# This builds a signed Android App Bundle (AAB) for Google Play Console
# Note: Android Studio uses C:\dev\shiftcoach\android (Windows path)
#       But we build from WSL at /home/growli/shiftcali/shiftcali

set -e  # Exit on error

echo "🚀 Building ShiftCoach for Play Store (WSL)..."
echo "Note: Android Studio uses C:\dev\shiftcoach\android"
echo ""

# Step 1: Build Next.js for production
echo "📦 Step 1: Building Next.js production bundle..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Next.js build failed!"
    exit 1
fi

# Step 2: Sync Capacitor
echo ""
echo "🔄 Step 2: Syncing Capacitor..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed!"
    exit 1
fi

# Step 3: Build signed AAB
# Note: The Android folder should be accessible from Windows at C:\dev\shiftcoach\android
# We need to use the Windows path via /mnt/c
echo ""
echo "🔨 Step 3: Building signed Android App Bundle..."
echo "Using Android path: /mnt/c/dev/shiftcoach/android"

ANDROID_PATH="/mnt/c/dev/shiftcoach/android"

# Check if Android path exists
if [ ! -d "$ANDROID_PATH" ]; then
    echo "❌ ERROR: Android folder not found at $ANDROID_PATH"
    echo "Make sure C:\dev\shiftcoach\android exists and is accessible from WSL"
    exit 1
fi

cd "$ANDROID_PATH"

# Check if keystore exists
if [ ! -f "app/shiftcoach-release.keystore" ]; then
    echo "❌ ERROR: Keystore file not found!"
    echo "Expected at: $ANDROID_PATH/app/shiftcoach-release.keystore"
    echo ""
    echo "You need to create a keystore first:"
    echo "  1. Open C:\\dev\\shiftcoach\\android in Android Studio"
    echo "  2. Build → Generate Signed Bundle / APK"
    echo "  3. Create new keystore at: C:\\dev\\shiftcoach\\android\\app\\shiftcoach-release.keystore"
    echo "  4. Update C:\\dev\\shiftcoach\\android\\keystore.properties with passwords"
    exit 1
fi

# Check if keystore.properties exists
if [ ! -f "keystore.properties" ]; then
    echo "❌ ERROR: keystore.properties not found!"
    echo "Create $ANDROID_PATH/keystore.properties with:"
    echo "  MYAPP_RELEASE_STORE_FILE=shiftcoach-release.keystore"
    echo "  MYAPP_RELEASE_STORE_PASSWORD=your-password"
    echo "  MYAPP_RELEASE_KEY_ALIAS=shiftcoach"
    echo "  MYAPP_RELEASE_KEY_PASSWORD=your-password"
    exit 1
fi

# Build the AAB using Gradle
echo "Running Gradle build..."
./gradlew bundleRelease

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Check errors above."
    exit 1
fi

# Check if build succeeded
AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
    AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
    echo ""
    echo "✅ SUCCESS! Signed AAB created:"
    echo "   $ANDROID_PATH/$AAB_PATH"
    echo "   Size: $AAB_SIZE"
    echo ""
    echo "📤 Next steps:"
    echo "  1. Go to Google Play Console"
    echo "  2. Select your app → Internal testing → Create new release"
    echo "  3. Upload the AAB file from: C:\\dev\\shiftcoach\\android\\app\\build\\outputs\\bundle\\release\\app-release.aab"
    echo "  4. Fill in release notes and submit"
    echo ""
else
    echo "❌ ERROR: AAB file not found. Check build errors above."
    exit 1
fi

