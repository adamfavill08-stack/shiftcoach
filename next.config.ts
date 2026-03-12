import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mobile-only app - optimize for Capacitor/WebView
  // Use the default runtime output so dynamic routes (Supabase APIs) work correctly.
  
  // Image optimization - optimized for mobile devices
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    // Mobile-optimized sizes (smaller than web)
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 300, // Longer cache for mobile (5 minutes)
  },
  
  // Compression
  compress: true,
  
  // Optimize production builds for mobile
  productionBrowserSourceMaps: false, // Disable source maps for smaller bundles
  // Note: SWC minification is enabled by default in Next.js 16, no need to set it
  
  // Experimental optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
    ],
    // Mobile-specific optimizations
    optimizeCss: true, // Optimize CSS for mobile
  },
  
  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  // Empty config silences the warning - Turbopack handles optimization automatically
  turbopack: {},
  
  // Ensure environment variables are loaded
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    REVENUECAT_API_KEY: process.env.REVENUECAT_API_KEY,
  },
};

export default nextConfig;
