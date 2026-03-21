# Fast Play Store Release Guide

## 🚀 Quick Path to Release

### Step 1: Build Release AAB (5 minutes)

**In Android Studio:**
1. **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Click **Next**
4. Select your keystore:
   - **Key store path**: `C:\dev\shiftcoach\android\app\shiftcoach-release.keystore`
   - **Key store password**: (your password)
   - **Key alias**: (your alias)
   - **Key password**: (your password)
5. Click **Next**
6. Select **release** build variant
7. Click **Create**
8. Save the `.aab` file somewhere safe

**Location**: `C:\dev\shiftcoach\android\app\release\app-release.aab`

---

### Step 2: Upload to Closed Testing (Required) (10 minutes)

**⚠️ IMPORTANT: Google Play now REQUIRES a Closed Test before Production!**

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. **Testing → Closed testing** → **Create new release**
4. Upload your `.aab` file
5. Fill in **Release name**: `1.0.5` (or your version)
6. Fill in **Release notes**
7. **Testers → Create email list**
8. Add your email (and anyone else you want to test)
9. Click **Save**
10. Click **Review release → Start rollout**

### Step 2b: Test for 2-3 Days

- Download the app from the test link
- Test on your phone
- Test core features (login, payments, main features)
- Fix any bugs you find

### Step 3: Apply for Production Access (5 minutes)

1. Go to **Production** section
2. Click **"Apply for access to production"**
3. Answer questions about your closed test:
   - Testers: "1-5 testers"
   - Duration: "2-3 days"
   - Features tested: "All core features"
   - Issues: "No critical issues" (or list what you fixed)
4. Submit application
5. Wait for approval (1-3 days)

### Step 4: Release to Production (After Approval)

Once approved:
1. **Production → Create new release**
2. Upload your `.aab` file
3. Fill in release notes
4. **Review release → Start rollout**

---

### Step 3: Complete Store Listing (15-20 minutes)

**Required:**
- ✅ App name
- ✅ Short description (80 chars)
- ✅ Full description (4000 chars)
- ✅ App icon (512x512 PNG)
- ✅ Feature graphic (1024x500)
- ✅ Screenshots (at least 2, up to 8)
- ✅ Privacy Policy URL
- ✅ Content rating questionnaire

**Quick tips:**
- Use existing screenshots from your app
- Privacy Policy: Link to `https://www.shiftcoach.app/privacy-policy`
- Content rating: Answer honestly (usually "Everyone" or "Teen")

---

### Step 4: Submit for Review (2 minutes)

1. **Production** → **Review release**
2. Check all sections are complete (green checkmarks)
3. Click **Start rollout to Production**
4. Click **Confirm**

---

## ⚡ Speed Tips

### For Fastest Approval:
1. **Complete all sections** - Incomplete listings take longer
2. **Clear privacy policy** - Required, must be accessible
3. **Good screenshots** - Shows app quality
4. **Accurate content rating** - Wrong rating = rejection
5. **Test on real device first** - Catch bugs before review
6. **Actually test in Closed Test** - Don't just upload and wait
7. **Add real testers** - Even 2-3 people helps

### Typical Timeline:
- **Closed Test**: 2-3 days (required)
- **Production Access Approval**: 1-3 days
- **Production Review**: 1-3 days
- **Total**: 4-9 days for first release
- **Updates**: Can go straight to Production (1-3 days)

---

## 📋 Pre-Upload Checklist

Before uploading, make sure:

- [ ] Version code incremented (currently 7, use 8+)
- [ ] Version name set (e.g., "1.0.5")
- [ ] Keystore file exists and is secure
- [ ] App tested on emulator/real device
- [ ] All features working
- [ ] Privacy Policy page live
- [ ] Terms of Service page live
- [ ] Health Data Notice page live
- [ ] Account deletion works
- [ ] Payments working (RevenueCat)

---

## 🎯 Minimum Viable Release

**Absolute minimum to submit:**
1. ✅ AAB file built
2. ✅ App name
3. ✅ Short description
4. ✅ 2 screenshots
5. ✅ App icon
6. ✅ Privacy Policy URL
7. ✅ Content rating done

**But for faster approval, also include:**
- Full description
- Feature graphic
- More screenshots (4-8)
- Terms of Service URL

---

## 🚨 Common Rejection Reasons (Avoid These!)

1. **Missing Privacy Policy** - Must be accessible URL
2. **Incomplete content rating** - Must complete questionnaire
3. **App crashes** - Test thoroughly first
4. **Missing required permissions** - Declare all permissions
5. **Payment issues** - RevenueCat must be working
6. **Account deletion** - Must be accessible

---

## 📱 After Submission

1. **Wait for review** (1-3 days typically)
2. **Check email** for any issues
3. **Fix any problems** if rejected
4. **Resubmit** (usually faster second time)

---

## 🎉 Once Approved

- App goes live automatically
- Users can download from Play Store
- You can track downloads in Play Console
- Monitor reviews and ratings

**Good luck with your release!** 🚀
