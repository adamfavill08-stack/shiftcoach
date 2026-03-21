#!/bin/bash
# Quick script to copy android folder to Windows after syncing

set -e

echo "🔄 Syncing and copying to Windows..."
echo ""

# Step 1: Build Next.js
echo "📦 Building Next.js..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Step 2: Sync Capacitor
echo ""
echo "🔄 Syncing Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed!"
    exit 1
fi

# Step 3: Copy to Windows
echo ""
echo "📁 Copying to Windows..."
WINDOWS_PATH="/mnt/c/dev/shiftcoach"

# Create directory if it doesn't exist
mkdir -p "$WINDOWS_PATH"

# Copy android folder
cp -r android "$WINDOWS_PATH/"

echo ""
echo "✅ Done! Android folder copied to: C:\\dev\\shiftcoach\\android"
echo ""
echo "📱 Next steps:"
echo "  1. Open Android Studio"
echo "  2. File → Open → C:\\dev\\shiftcoach\\android"
echo "  3. File → Sync Project with Gradle Files"
echo ""
