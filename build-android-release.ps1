# Build script for Android Play Store release (PowerShell)
# This builds a signed Android App Bundle (AAB) for Google Play Console
# Note: This script should be run from WSL, but Android Studio uses C:\dev\shiftcoach\android

$ErrorActionPreference = "Stop"

Write-Host "🚀 Building ShiftCoach for Play Store..." -ForegroundColor Cyan
Write-Host "Note: Building in WSL, Android Studio uses C:\dev\shiftcoach\android" -ForegroundColor Gray

# Step 1: Build Next.js for production (in WSL)
Write-Host "`n📦 Step 1: Building Next.js production bundle (WSL)..." -ForegroundColor Yellow
wsl bash -c "cd /home/growli/shiftcali/shiftcali && npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Next.js build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Sync Capacitor (in WSL)
Write-Host "`n🔄 Step 2: Syncing Capacitor (WSL)..." -ForegroundColor Yellow
wsl bash -c "cd /home/growli/shiftcali/shiftcali && npx cap sync android"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Build signed AAB (using Windows Android Studio path)
Write-Host "`n🔨 Step 3: Building signed Android App Bundle..." -ForegroundColor Yellow
Write-Host "Using Android path: C:\dev\shiftcoach\android" -ForegroundColor Gray
Set-Location C:\dev\shiftcoach\android

# Check if keystore exists (in Windows path)
if (-not (Test-Path "app/shiftcoach-release.keystore")) {
    Write-Host "`n❌ ERROR: Keystore file not found!" -ForegroundColor Red
    Write-Host "Expected at: C:\dev\shiftcoach\android\app\shiftcoach-release.keystore" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You need to create a keystore first. Recommended:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Using Android Studio:" -ForegroundColor Cyan
    Write-Host "  1. Open C:\dev\shiftcoach\android in Android Studio"
    Write-Host "  2. Build → Generate Signed Bundle / APK"
    Write-Host "  3. Create new keystore at: C:\dev\shiftcoach\android\app\shiftcoach-release.keystore"
    Write-Host "  4. Update C:\dev\shiftcoach\android\keystore.properties with passwords"
    Write-Host ""
    exit 1
}

# Check if keystore.properties exists
if (-not (Test-Path "keystore.properties")) {
    Write-Host "`n❌ ERROR: keystore.properties not found!" -ForegroundColor Red
    Write-Host "Create android/keystore.properties with:" -ForegroundColor Yellow
    Write-Host "  MYAPP_RELEASE_STORE_FILE=shiftcoach-release.keystore"
    Write-Host "  MYAPP_RELEASE_STORE_PASSWORD=your-password"
    Write-Host "  MYAPP_RELEASE_KEY_ALIAS=shiftcoach"
    Write-Host "  MYAPP_RELEASE_KEY_PASSWORD=your-password"
    exit 1
}

# Build the AAB
Write-Host "Running Gradle build..." -ForegroundColor Gray
if ($IsLinux -or $IsMacOS) {
    ./gradlew bundleRelease
} else {
    .\gradlew.bat bundleRelease
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Build failed! Check errors above." -ForegroundColor Red
    exit 1
}

# Check if build succeeded
$AABPath = "app/build/outputs/bundle/release/app-release.aab"
if (Test-Path $AABPath) {
    $AABSize = (Get-Item $AABPath).Length / 1MB
    Write-Host ""
    Write-Host "✅ SUCCESS! Signed AAB created:" -ForegroundColor Green
    Write-Host "   $((Get-Location).Path)/$AABPath" -ForegroundColor Cyan
    Write-Host "   Size: $([math]::Round($AABSize, 2)) MB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📤 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to Google Play Console" -ForegroundColor White
    Write-Host "  2. Select your app → Internal testing → Create new release" -ForegroundColor White
    Write-Host "  3. Upload the AAB file" -ForegroundColor White
    Write-Host "  4. Fill in release notes and submit" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "`n❌ ERROR: AAB file not found. Check build errors above." -ForegroundColor Red
    exit 1
}

Set-Location ..

