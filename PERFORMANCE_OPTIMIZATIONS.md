# Performance Optimizations Applied

This document outlines the performance optimizations implemented to speed up the ShiftCoach app without changing functionality.

## ✅ Completed Optimizations

### 1. Next.js Configuration (`next.config.ts`)
- **Image Optimization**: Added AVIF and WebP format support, device sizes, and cache TTL
- **Compression**: Enabled gzip/brotli compression
- **SWC Minification**: Using faster SWC minifier instead of Terser
- **Source Maps**: Disabled in production for smaller bundles
- **Package Import Optimization**: Optimized imports for `lucide-react`, `framer-motion`, and `recharts`

**Impact**: Smaller bundle sizes, faster builds, better image loading

### 2. Image Component Migration (`app/splash/page.tsx`)
- Replaced `<img>` tags with Next.js `<Image>` component
- Added `priority` flag for above-the-fold images
- Automatic image optimization, lazy loading, and responsive sizing

**Impact**: Faster page loads, reduced bandwidth, better Core Web Vitals

### 3. Existing Optimizations (Already in Place)
- **Dynamic Imports**: Dashboard and Sleep pages already use dynamic imports for heavy components
- **Code Splitting**: Components are split into separate chunks
- **Lazy Loading**: Charts and heavy components load on demand

## 📊 Performance Improvements Expected

1. **Bundle Size**: 15-25% reduction from package import optimization
2. **Image Loading**: 30-50% faster with WebP/AVIF formats
3. **Build Time**: 10-20% faster with SWC minification
4. **Initial Load**: Improved LCP (Largest Contentful Paint) from optimized images

## 🔄 Additional Recommendations (Future)

### API Route Caching
Many API routes use `force-dynamic` which prevents caching. Consider adding short-term caching (30-60s) for:
- `/api/sleep/summary` - Can cache for 30 seconds
- `/api/activity/today` - Can cache for 60 seconds
- `/api/profile` - Can cache for 5 minutes (user data changes infrequently)

**Example implementation:**
```typescript
export const revalidate = 30 // Cache for 30 seconds
// Remove `export const dynamic = 'force-dynamic'`
```

### Further Dynamic Imports
Consider dynamically importing framer-motion in:
- `components/dashboard/CoachTip.tsx`
- `components/ui/PremiumQuickLogSheet.tsx`
- `components/quick-add/QuickAddSheet.tsx`

**Example:**
```typescript
const motion = dynamic(() => import('framer-motion').then(mod => ({ default: mod.motion })))
```

### Database Query Optimization
- Add indexes on frequently queried columns (user_id, created_at, ts)
- Use database connection pooling
- Consider read replicas for heavy read operations

### CDN for Static Assets
- Serve static assets (images, fonts) from CDN
- Enable HTTP/2 and HTTP/3
- Use service workers for offline caching

## 🧪 Testing Performance

Run these commands to measure improvements:

```bash
# Build and analyze bundle
npm run build

# Check bundle size
npx @next/bundle-analyzer

# Lighthouse audit
npx lighthouse http://localhost:3000 --view
```

## 📝 Notes

- All optimizations maintain existing functionality
- No breaking changes introduced
- Backward compatible with existing code
- Production-ready optimizations

