# RevenueCat Setup Instructions

**Status**: Backend infrastructure complete ✅  
**Next Steps**: Install Capacitor plugin and configure RevenueCat account

---

## ✅ What's Been Completed

### Phase 2: Database Schema ✅
- ✅ Migration created: `supabase/migrations/20250129_add_revenuecat_columns.sql`
- ✅ Adds columns: `revenuecat_user_id`, `revenuecat_subscription_id`, `revenuecat_entitlements`, `subscription_platform`
- ✅ Profile type updated with RevenueCat fields

### Phase 4: Backend APIs ✅
- ✅ `/api/revenuecat/validate-receipt` - Validates native purchase receipts
- ✅ `/api/revenuecat/webhook` - Handles RevenueCat webhook events
- ✅ `/api/revenuecat/status` - Gets subscription status from RevenueCat
- ✅ `/api/revenuecat/cancel` - Handles subscription cancellation

### Phase 5: Frontend Integration ✅ (Partial)
- ✅ Native purchase service: `lib/purchases/native-purchases.ts`
- ✅ React hook: `lib/hooks/useNativePurchases.ts`
- ✅ Plan selection page updated to detect platform and route to native purchases

---

## 🔧 What Needs to Be Done

### Phase 1: RevenueCat Account Setup (User Action Required)

**You need to:**

1. **Create RevenueCat Account**
   - Go to https://www.revenuecat.com
   - Sign up for free account
   - Create project: "Shift Coach"
   - Copy your **Secret API Key** (starts with `sk_`)

2. **Configure App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Navigate to your app → Features → In-App Purchases
   - Create subscription products:
     - Product ID: `shiftcoach_monthly`
     - Price: £3.99/month
     - Product ID: `shiftcoach_yearly`
     - Price: £43.00/year
   - Create subscription group
   - Note the Product IDs

3. **Configure Google Play Console**
   - Go to https://play.google.com/console
   - Navigate to your app → Monetize → Products → Subscriptions
   - Create subscription products:
     - Product ID: `shiftcoach_monthly`
     - Price: £3.99/month
     - Product ID: `shiftcoach_yearly`
     - Price: £43.00/year
   - Note the Product IDs

4. **Link Stores in RevenueCat**
   - In RevenueCat dashboard → Integrations
   - Connect App Store Connect account
   - Connect Google Play Console account
   - Map products (Product IDs must match)
   - Create offerings (group products together)

5. **Set Up Webhook**
   - In RevenueCat dashboard → Project Settings → Webhooks
   - Add webhook URL: `https://www.shiftcoach.app/api/revenuecat/webhook`
   - Select events:
     - `INITIAL_PURCHASE`
     - `RENEWAL`
     - `CANCELLATION`
     - `BILLING_ISSUE`
     - `SUBSCRIPTION_PAUSED`
     - `SUBSCRIPTION_RESUMED`
   - Copy webhook secret (if provided)

6. **Add Environment Variables**
   Add to your `.env.local` and Vercel:
   ```env
   REVENUECAT_API_KEY=sk_your_secret_key_here
   REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here (optional but recommended)
   ```

---

### Phase 3: Capacitor Plugin Installation

**Research Required:**
- Need to find a Capacitor plugin that supports StoreKit 2 (iOS) and Play Billing 5+ (Android)
- Options to research:
  - `@capacitor-community/in-app-purchases` - Check if it supports latest APIs
  - `@capacitor-community/apple-pay` + `@capacitor-community/google-pay` - May not be for subscriptions
  - Custom Capacitor plugin - Bridge to native SDKs

**Once Plugin is Found:**

1. **Install Plugin**
   ```bash
   npm install [plugin-name]
   npx cap sync
   ```

2. **Update `lib/purchases/native-purchases.ts`**
   - Implement `purchaseProduct()` using plugin
   - Implement `restorePurchases()` using plugin
   - Implement `getAvailableProducts()` using plugin

3. **Configure iOS (if needed)**
   - Update `ios/App/App/Info.plist` if required
   - Configure StoreKit in Xcode

4. **Configure Android (if needed)**
   - Update `android/app/build.gradle` if required
   - Configure Play Billing in Android Studio

---

## 📋 Current Implementation Status

### Backend ✅
- Database migration ready
- API routes implemented
- Webhook handler ready
- Receipt validation ready

### Frontend ⚠️ (Needs Plugin)
- Platform detection works
- Purchase flow structure ready
- **BUT**: Actual native purchase calls need Capacitor plugin
- Currently returns "plugin not yet installed" errors

### What Works Now:
- ✅ Web users: Stripe Checkout (unchanged)
- ✅ Platform detection: Correctly identifies iOS/Android/Web
- ✅ Backend APIs: Ready to receive receipts and validate

### What Doesn't Work Yet:
- ❌ Native purchases: Need Capacitor plugin
- ❌ Receipt validation: Can't test until plugin is installed
- ❌ Webhook: Can't test until RevenueCat account is set up

---

## 🚀 Next Steps (In Order)

1. **Set Up RevenueCat Account** (You)
   - Create account, configure stores, link accounts
   - Add environment variables

2. **Research & Install Capacitor Plugin** (Me/You)
   - Find compatible plugin
   - Install and configure
   - Test basic purchase flow

3. **Complete Native Purchase Implementation** (Me)
   - Wire up plugin in `native-purchases.ts`
   - Test purchase flow
   - Test receipt validation

4. **Test End-to-End** (You)
   - Test on iOS device/emulator
   - Test on Android device/emulator
   - Verify webhook events
   - Test subscription renewal

---

## 📝 Environment Variables Needed

Add these to `.env.local` and Vercel:

```env
# RevenueCat
REVENUECAT_API_KEY=sk_your_secret_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here (optional)

# Keep existing Stripe for web
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
```

---

## 🔍 Testing Checklist

Once plugin is installed:

- [ ] iOS: Can initiate purchase
- [ ] iOS: Receipt is returned
- [ ] iOS: Receipt validates with RevenueCat
- [ ] iOS: Subscription status updates in database
- [ ] Android: Can initiate purchase
- [ ] Android: Receipt is returned
- [ ] Android: Receipt validates with RevenueCat
- [ ] Android: Subscription status updates in database
- [ ] Webhook: Receives INITIAL_PURCHASE event
- [ ] Webhook: Receives RENEWAL event
- [ ] Webhook: Receives CANCELLATION event
- [ ] Cancel subscription: Updates status correctly

---

**Current Status**: Backend ready, frontend structure ready, waiting for Capacitor plugin and RevenueCat account setup.
