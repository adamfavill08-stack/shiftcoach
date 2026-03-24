# Mobile-Only Payment Setup (Play Store & App Store)

**Important**: This app is **mobile-only** (iOS/Android). No web users.

---

## 🎯 Payment System

### Single Payment System: RevenueCat
- ✅ **iOS**: App Store billing (via RevenueCat)
- ✅ **Android**: Play Store billing (via RevenueCat)
- ❌ **Web**: Not supported (app is mobile-only)


## 💳 How Payments Work

### User Journey:
1. User downloads app from Play Store/App Store
2. Opens app → Signs up
3. Redirected to `/select-plan` page
4. Selects plan (Monthly/Yearly)
5. Clicks "Start 7-Day Free Trial"
6. **Native purchase dialog** appears:
   - **iOS**: App Store purchase dialog
   - **Android**: Play Store purchase dialog
7. User confirms with Apple ID/Google account
8. Payment processed by **App Store/Play Store**
9. Receipt sent to RevenueCat for validation
10. Subscription activated → User gets 7-day free trial
11. After 7 days → Automatically charged by store
12. Redirected to `/onboarding`

---

## 📍 Where Users See Subscription Info

### 1. **Plan Selection Page** (`/select-plan`)
- First page after sign-up
- Shows Monthly/Yearly plans
- Shows 7-day free trial
- **Button**: "Start 7-Day Free Trial"
- **This is where they commit to subscription**

### 2. **Settings Page** (`/settings`)
- Shows current subscription plan
- Shows subscription status (Active/Canceled)
- Shows billing platform (App Store/Play Store)
- Cancel subscription button

---

## 🔒 Subscription Enforcement

### How It Works:
1. **App checks subscription on load**
   - If no plan → Redirect to `/select-plan`
   - If subscription expired → Redirect to `/select-plan`
   - If subscription active → Allow access

2. **Subscription Status Check**:
   - Checks `subscription_plan` (monthly/yearly)
   - Checks `subscription_status` (active/trialing/expired)
   - Blocks access if not subscribed

3. **7-Day Free Trial**:
   - Configured in App Store/Play Store products
   - User commits to subscription, gets 7 days free
   - After 7 days, automatically charged by store
   - During trial: `subscription_status: 'trialing'`
   - After trial: `subscription_status: 'active'`

---

## 🛠️ What's Implemented

### ✅ Completed:
- RevenueCat integration (backend APIs)
- Native purchase detection (iOS/Android)
- Plan selection page (mobile-only)
- Subscription status checking
- Access enforcement (blocks non-subscribers)

### ⏳ Still Needed:
- Capacitor plugin for native purchases
- Test purchase flow on devices
- Webhook setup in RevenueCat

---

## 📋 Code Changes Made

### 1. Plan Selection Page
- Removed legacy web checkout flow
- Only uses native purchases
- Shows error if accessed on web (shouldn't happen)

### 2. Subscription Checking
- Enhanced to check subscription status
- Blocks expired/canceled subscriptions
- Redirects to `/select-plan` if no access

---

## ⚠️ Important Notes

### App Store/Play Store Requirements:
- ✅ Products must be created in stores
- ✅ Products must be "Active" status
- ✅ Free trial configured in store products
- ✅ Products linked to RevenueCat

### Testing:
- Use **Sandbox Test Accounts** (iOS)
- Use **License Testing** accounts (Android)
- Test purchases don't charge real money
- Test on real devices or emulators

### Payment Processing:
- **You don't handle payments directly**
- App Store/Play Store handle all payments
- RevenueCat validates receipts
- You receive webhooks for subscription events

---

## 🚀 Next Steps

1. ✅ RevenueCat account created
2. ✅ API key added
3. ⏳ Create products in Google Play Console
4. ⏳ Create products in App Store Connect
5. ⏳ Link stores to RevenueCat
6. ⏳ Install Capacitor plugin
7. ⏳ Test purchase flow
8. ⏳ Set up webhook

---

**Current Status**: Mobile-only payment system ready. Just need to complete store setup and install Capacitor plugin!
