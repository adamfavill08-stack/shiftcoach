#!/bin/bash
# Quick script to build and sync to Android Studio
# Run this from WSL

set -e

echo "🚀 Building and syncing to Android Studio..."
echo ""

# Step 1: Build Next.js
echo "📦 Step 1: Building Next.js..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Next.js build complete"
echo ""

# Step 2: Sync Capacitor
echo "🔄 Step 2: Syncing Capacitor to Android..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed!"
    exit 1
fi

echo ""
echo "✅ Sync complete!"
echo ""
echo "📁 Copying to Windows (C:\\dev\\shiftcoach\\android)..."
WINDOWS_PATH="/mnt/c/dev/shiftcoach"
mkdir -p "$WINDOWS_PATH"
cp -r android "$WINDOWS_PATH/"
echo "✅ Copied to Windows!"
echo ""
echo "📱 Next steps:"
echo "  1. Open Android Studio"
echo "  2. File → Open → C:\\dev\\shiftcoach\\android"
echo "  3. File → Sync Project with Gradle Files"
echo "  4. Use Windows JDK: C:\\Program Files\\Android\\Android Studio\\jbr"
echo ""

