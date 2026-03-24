# Play Store Readiness Checklist

**Date:** Generated  
**App:** ShiftCoach  
**Status:** 🟡 **Almost Ready - Review Required**

---

## ✅ **What You Have (Good!)**

### 1. **Legal Documents** ✅
- ✅ Privacy Policy page exists (`app/privacy-policy/page.tsx`)
- ✅ Terms of Service page exists (`app/terms-of-service/page.tsx`)
- ✅ Health Data Notice page exists (`app/health-data-notice/page.tsx`)
- ✅ All linked in settings

**⚠️ Action Required:** Review these pages to ensure they:
- Cover all data you collect (sleep, activity, health data, Google Fit, etc.)
- Mention Supabase, RevenueCat, Resend, OpenAI (third-party services)
- Include your contact information
- Are accurate and complete

---

## 🔴 **CRITICAL - Must Complete Before Submission**

### 1. **App Signing & Build Configuration** ⚡
**Status:** ⚠️ Needs Verification

**Check:**
- [ ] App is signed with a release keystore
- [ ] `android/app/build.gradle` has `signingConfigs` for release
- [ ] Keystore file is secure (NOT in git - use environment variables)
- [ ] Build variant is set to `release` for Play Store

**Action:**
```bash
# Generate keystore (if not done)
keytool -genkey -v -keystore shiftcoach-release.keystore -alias shiftcoach -keyalg RSA -keysize 2048 -validity 10000

# Add to android/gradle.properties (NEVER commit this file):
MYAPP_RELEASE_STORE_FILE=shiftcoach-release.keystore
MYAPP_RELEASE_KEY_ALIAS=shiftcoach
MYAPP_RELEASE_STORE_PASSWORD=your-password
MYAPP_RELEASE_KEY_PASSWORD=your-password
```

**Time:** 30 minutes

---

### 2. **App Bundle (AAB) Generation** ⚡
**Status:** ⚠️ Needs Testing

**Action:**
```bash
cd android
./gradlew bundleRelease
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

**Time:** 10 minutes

---

### 3. **App Icon & Assets** ⚡
**Status:** ⚠️ Needs Verification

**Required:**
- [ ] App icon (512x512 PNG, no transparency)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (at least 2, up to 8):
  - Phone: 16:9 or 9:16 aspect ratio
  - Minimum: 320px, Maximum: 3840px
  - Recommended: 1080x1920 or 1920x1080

**Check:**
- [ ] Icon is in `android/app/src/main/res/mipmap-*/`
- [ ] Icon looks good at all sizes

**Time:** 1-2 hours (if creating new assets)

---

### 4. **App Information for Play Console** ⚡
**Status:** ⚠️ Needs Preparation

**Required:**
- [ ] **App Name:** "ShiftCoach" (or your chosen name)
- [ ] **Short Description:** 80 characters max
- [ ] **Full Description:** 4000 characters max
- [ ] **Category:** Health & Fitness
- [ ] **Content Rating:** Complete questionnaire
- [ ] **Privacy Policy URL:** `https://yourdomain.com/privacy-policy`
- [ ] **Contact Email:** Your support email
- [ ] **Website:** Your website URL (if you have one)

**Time:** 30 minutes

---

### 5. **Permissions & Data Safety** ⚡
**Status:** ⚠️ Needs Review

**Check AndroidManifest.xml:**
- [ ] All permissions are necessary and explained
- [ ] Health data permissions are properly declared
- [ ] Google Fit integration is disclosed

**Play Console Requirements:**
- [ ] Complete "Data Safety" section:
  - What data you collect (health, activity, sleep)
  - How you use it (app functionality)
  - Who you share it with (Supabase, Google Fit, OpenAI)
  - Data security practices
  - Data deletion policy

**Time:** 1-2 hours

---

### 6. **Testing on Real Devices** ⚡
**Status:** ⚠️ Highly Recommended

**Test:**
- [ ] Install AAB on real Android device
- [ ] Test all major features:
  - Sign up / Sign in
  - Dashboard loads
  - Sleep logging
  - Shift calendar
  - Google Fit sync
  - AI Coach
  - Settings
- [ ] Test on different Android versions (if possible)
- [ ] Test on different screen sizes

**Time:** 2-3 hours

---

## 🟡 **HIGH PRIORITY - Should Complete**

### 7. **Content Rating Questionnaire** 🟡
**Status:** Required by Play Store

**Complete in Play Console:**
- [ ] Answer all questions about app content
- [ ] Health/medical data questions
- [ ] User-generated content questions
- [ ] Age-appropriate rating

**Time:** 15 minutes

---

### 8. **Store Listing Optimization** 🟡
**Status:** Recommended

**Optimize:**
- [ ] Write compelling app description
- [ ] Add keywords for discoverability
- [ ] Create promotional text (80 chars)
- [ ] Add app promo video (optional but recommended)

**Time:** 1-2 hours

---

### 9. **Pricing & Distribution** 🟡
**Status:** Needs Decision

**Decide:**
- [ ] Free or paid app?
- [ ] In-app subscriptions configured via RevenueCat + Google Play Billing
- [ ] Which countries to launch in?
- [ ] Age restrictions?

**Time:** 30 minutes

---

### 10. **Support & Contact** 🟡
**Status:** Needs Setup

**Required:**
- [ ] Support email address
- [ ] Support website (optional but recommended)
- [ ] Response time commitment

**Time:** 15 minutes

---

## 🟢 **NICE TO HAVE - Can Add Later**

### 11. **Beta Testing** 🟢
- [ ] Set up internal testing track
- [ ] Invite testers
- [ ] Collect feedback

### 12. **App Updates Strategy** 🟢
- [ ] Plan for regular updates
- [ ] Set up crash reporting (consider Sentry)
- [ ] Monitor user reviews

---

## 📋 **Pre-Submission Checklist**

Before clicking "Submit for Review":

- [ ] All legal pages reviewed and accurate
- [ ] App signed with release keystore
- [ ] AAB file generated and tested
- [ ] App icon and screenshots ready
- [ ] Store listing information complete
- [ ] Data Safety section completed
- [ ] Content rating questionnaire done
- [ ] Tested on real device(s)
- [ ] All critical features working
- [ ] Support email configured
- [ ] Privacy policy URL accessible

---

## 🚀 **Submission Steps**

1. **Create Google Play Developer Account** ($25 one-time fee)
2. **Create New App** in Play Console
3. **Upload AAB** file
4. **Complete Store Listing** (all sections)
5. **Complete Data Safety** section
6. **Set Content Rating**
7. **Add Screenshots & Graphics**
8. **Review & Submit** for review

**Review Time:** Usually 1-3 days

---

## ⚠️ **Common Rejection Reasons**

Avoid these:
- ❌ Missing or incomplete privacy policy
- ❌ Data Safety section incomplete
- ❌ App crashes on launch
- ❌ Missing required permissions
- ❌ Health data not properly disclosed
- ❌ Broken links (privacy policy, etc.)

---

## 📞 **Need Help?**

**Resources:**
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Bundle Guide](https://developer.android.com/guide/app-bundle)
- [Data Safety Guide](https://support.google.com/googleplay/android-developer/answer/10787469)

---

## ✅ **Final Status**

**Your App is:** 🟡 **Almost Ready**

**What's Left:**
1. Review legal pages (30 min - 2 hours)
2. Set up app signing (30 min)
3. Generate AAB file (10 min)
4. Create/store listing assets (1-2 hours)
5. Complete Play Console setup (2-3 hours)
6. Test on real device (2-3 hours)

**Total Estimated Time:** 6-10 hours

**You're very close!** Most of the hard work (building the app) is done. The remaining tasks are mostly configuration and documentation.

