#!/bin/bash
# Quick fix for blank screen - switches to localhost for testing

echo "🔧 Fixing blank screen by switching to localhost..."
echo ""

# Backup original config
cp capacitor.config.ts capacitor.config.prod.ts.bak

# Create dev config
cat > capacitor.config.ts << 'EOF'
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shiftcoach.app',
  appName: 'shiftcoach-app',
  webDir: 'public',
  server: {
    // For local testing - Android emulator uses 10.0.2.2 to access host localhost
    url: 'http://10.0.2.2:3000',
    cleartext: true, // Allow HTTP for localhost
  },
};

export default config;
EOF

echo "✅ Updated capacitor.config.ts to use localhost"
echo ""
echo "📋 Next steps:"
echo "  1. Start Next.js dev server: npm run dev"
echo "  2. Sync Capacitor: npx cap sync android"
echo "  3. Rebuild in Android Studio"
echo ""
echo "⚠️  Remember: For Play Store builds, switch back to production URL!"

