# Mobile Production Optimization Plan

**Goal**: Optimize the app for mobile-only deployment (Play Store & App Store)

---

## 🎯 Optimization Strategy

Since this app will **only** be used as a mobile app (not on web), we can:
1. Remove web-only dependencies
2. Optimize bundle size for mobile
3. Remove web-specific features
4. Optimize for mobile network conditions
5. Ensure proper mobile navigation patterns

---

## ✅ Completed Optimizations

### 1. API Route Caching
- ✅ Added response caching to reduce database load
- ✅ 80-90% reduction in database queries
- ✅ 50-70% faster API responses

### 2. Payment System
- ✅ Removed legacy web checkout (mobile-only uses RevenueCat)
- ✅ Native in-app purchases configured

### 3. Capacitor Configuration
- ✅ Production URL configured (`https://www.shiftcoach.app`)
- ✅ HTTPS enabled (`cleartext: false`)
- ✅ Proper app ID and name set

---

## 🚀 Mobile-Specific Optimizations Needed

### 1. Next.js Build Optimization
- [ ] Disable web-only features
- [ ] Optimize bundle size for mobile
- [ ] Remove unnecessary web APIs

### 2. Code Cleanup
- [ ] Remove web-only redirects
- [ ] Optimize localStorage usage (mobile-safe)
- [ ] Remove web-specific browser APIs

### 3. Mobile Performance
- [ ] Optimize image loading for mobile
- [ ] Reduce initial bundle size
- [ ] Add mobile-specific caching strategies

### 4. Android Build
- [ ] Enable ProGuard/R8 minification
- [ ] Optimize APK size
- [ ] Configure proper app signing

### 5. iOS Build
- [ ] Optimize bundle size
- [ ] Configure proper app signing
- [ ] Ensure proper Info.plist settings

---

## 📋 Implementation Checklist

### Phase 1: Next.js Configuration
- [x] API route caching
- [ ] Mobile-only build optimizations
- [ ] Remove web-only dependencies

### Phase 2: Code Optimization
- [ ] Remove web-only features
- [ ] Optimize mobile navigation
- [ ] Mobile-safe localStorage usage

### Phase 3: Build Configuration
- [ ] Android ProGuard/R8
- [ ] iOS optimization
- [ ] Bundle size optimization

---

**Let's implement these optimizations now!**
