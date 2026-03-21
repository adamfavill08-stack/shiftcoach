# RevenueCat Integration Plan for Shift Coach

**Date**: January 2025  
**Status**: Planning Phase  
**Priority**: Critical Blocker for Store Submission

---

## 🎯 Objective

Replace Stripe Checkout with native in-app purchases (StoreKit for iOS, Google Play Billing for Android) using RevenueCat to manage subscriptions across platforms while maintaining web support via Stripe.

---

## 📋 Current State

### Existing Payment Infrastructure
- ✅ Stripe Checkout implemented for web
- ✅ Subscription status stored in `profiles` table:
  - `subscription_plan` (monthly, yearly, tester)
  - `subscription_status` (active, canceled, past_due, trialing, incomplete)
  - `stripe_customer_id`
  - `stripe_subscription_id`
- ✅ API routes:
  - `/api/payment/create-checkout` - Creates Stripe checkout session
  - `/api/payment/verify` - Verifies Stripe payment
  - `/api/subscription/cancel` - Cancels Stripe subscription
- ✅ UI: `app/select-plan/page.tsx` - Plan selection page

### Architecture
- **Framework**: Next.js 16 (App Router)
- **Mobile**: Capacitor 7 (wraps web app for iOS/Android)
- **Database**: Supabase (PostgreSQL)
- **Current Payment**: Stripe (web only, non-compliant for mobile)

---

## 🏗️ Architecture Decision

### Option A: RevenueCat REST API + Capacitor Native Plugins (Recommended)

**Why This Approach:**
- RevenueCat doesn't have a Capacitor plugin
- We need native purchase flows (StoreKit/Play Billing)
- RevenueCat REST API handles receipt validation and subscription management
- Capacitor plugins bridge native purchase APIs to JavaScript

**Flow:**
1. User taps "Subscribe" in app
2. Capacitor plugin triggers native purchase (StoreKit/Play Billing)
3. Native purchase completes, returns receipt/transaction ID
4. Frontend sends receipt to our backend API
5. Backend validates receipt with RevenueCat REST API
6. RevenueCat webhook updates subscription status
7. Backend syncs status to Supabase

**Pros:**
- ✅ Store-compliant (uses native purchase APIs)
- ✅ RevenueCat handles cross-platform complexity
- ✅ Can keep Stripe for web
- ✅ RevenueCat provides analytics and webhooks

**Cons:**
- ⚠️ Requires Capacitor plugins for StoreKit/Play Billing
- ⚠️ More complex than pure RevenueCat SDK
- ⚠️ Need to handle receipt validation

### Option B: Pure Native Implementation (Not Recommended)

**Why Not:**
- More complex to maintain
- No unified subscription management
- Would need separate implementations for iOS/Android
- No built-in analytics

---

## 📦 Required Dependencies

### 1. Capacitor Plugins
```bash
npm install @capacitor-community/in-app-purchases
# OR
npm install @capacitor-community/apple-pay
npm install @capacitor-community/google-pay
```

**Note**: Need to verify which plugin supports StoreKit 2 and Play Billing 5+

### 2. RevenueCat REST API Client
```bash
npm install @revenuecat/purchases-js
# OR use native fetch/axios for REST API calls
```

### 3. Environment Variables
```env
# RevenueCat
REVENUECAT_API_KEY=your_secret_api_key
REVENUECAT_APP_USER_ID_PREFIX=shiftcoach_

# Keep Stripe for web
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

---

## 🔧 Implementation Steps

### Phase 1: RevenueCat Setup (1-2 days)

1. **Create RevenueCat Account**
   - Sign up at https://www.revenuecat.com
   - Create new project: "Shift Coach"
   - Note your API key

2. **Configure App Store Connect**
   - Create in-app purchase products:
     - `shiftcoach_monthly` - Monthly subscription (£3.99)
     - `shiftcoach_yearly` - Yearly subscription (£43.00)
   - Configure subscription groups
   - Note Product IDs

3. **Configure Google Play Console**
   - Create subscription products:
     - `shiftcoach_monthly` - Monthly subscription (£3.99)
     - `shiftcoach_yearly` - Yearly subscription (£43.00)
   - Note Product IDs

4. **Link Stores in RevenueCat**
   - Connect App Store Connect account
   - Connect Google Play Console account
   - Map products in RevenueCat dashboard
   - Create offerings (group products)

5. **Set Up RevenueCat Webhooks**
   - Webhook URL: `https://www.shiftcoach.app/api/revenuecat/webhook`
   - Events to listen for:
     - `INITIAL_PURCHASE`
     - `RENEWAL`
     - `CANCELLATION`
     - `BILLING_ISSUE`
     - `SUBSCRIPTION_PAUSED`
     - `SUBSCRIPTION_RESUMED`

### Phase 2: Database Schema Updates (1 day)

**Add RevenueCat columns to `profiles` table:**

```sql
-- Add RevenueCat user ID
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_user_id TEXT;
CREATE INDEX IF NOT EXISTS profiles_revenuecat_user_id_idx ON profiles(revenuecat_user_id) WHERE revenuecat_user_id IS NOT NULL;

-- Add RevenueCat subscription info
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_entitlements JSONB;

-- Add platform tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_platform TEXT CHECK (subscription_platform IN ('stripe', 'revenuecat_ios', 'revenuecat_android'));
```

**Migration file**: `supabase/migrations/20250129_add_revenuecat_columns.sql`

### Phase 3: Capacitor Plugin Integration (2-3 days)

1. **Install and Configure Plugin**
   ```bash
   npm install @capacitor-community/in-app-purchases
   npx cap sync
   ```

2. **Create Purchase Service** (`lib/purchases/native-purchases.ts`)
   - Detect platform (iOS/Android/Web)
   - Initialize native purchase plugin
   - Expose purchase functions:
     - `purchaseProduct(productId: string)`
     - `restorePurchases()`
     - `getAvailableProducts()`

3. **Platform Detection**
   - Use Capacitor's `getPlatform()` to detect iOS/Android
   - Web: Fall back to Stripe Checkout
   - iOS: Use StoreKit via plugin
   - Android: Use Play Billing via plugin

### Phase 4: Backend API Routes (3-4 days)

#### 4.1 Receipt Validation API
**File**: `app/api/revenuecat/validate-receipt/route.ts`

**Purpose**: Validate native purchase receipts with RevenueCat

**Flow**:
1. Receive receipt/transaction ID from frontend
2. Get user ID from session
3. Call RevenueCat REST API to validate receipt
4. Update user's subscription in Supabase
5. Return subscription status

**RevenueCat REST API Call**:
```typescript
POST https://api.revenuecat.com/v1/receipts
Headers:
  Authorization: Bearer {REVENUECAT_API_KEY}
  Content-Type: application/json
Body:
{
  "app_user_id": "shiftcoach_{userId}",
  "fetch_token": "{receipt_data}",
  "platform": "ios" | "android"
}
```

#### 4.2 Webhook Handler
**File**: `app/api/revenuecat/webhook/route.ts`

**Purpose**: Handle RevenueCat webhook events

**Events to Handle**:
- `INITIAL_PURCHASE` - Activate subscription
- `RENEWAL` - Update subscription status
- `CANCELLATION` - Mark as canceled, schedule deletion
- `BILLING_ISSUE` - Mark as past_due
- `SUBSCRIPTION_PAUSED` - Handle pause (if applicable)

**Security**: Verify webhook signature from RevenueCat

#### 4.3 Subscription Status API
**File**: `app/api/revenuecat/status/route.ts`

**Purpose**: Get current subscription status from RevenueCat

**Use Case**: Check subscription status on app load

### Phase 5: Frontend Integration (2-3 days)

#### 5.1 Update Plan Selection Page
**File**: `app/select-plan/page.tsx`

**Changes**:
- Detect platform (iOS/Android/Web)
- **Web**: Keep Stripe Checkout flow
- **iOS/Android**: Use native purchase flow
  - Call Capacitor plugin to initiate purchase
  - Show native purchase UI
  - On success, send receipt to `/api/revenuecat/validate-receipt`
  - Update UI with subscription status

#### 5.2 Update Subscription Settings
**File**: `app/(app)/settings/components/SubscriptionPlanSection.tsx`

**Changes**:
- Show subscription source (Stripe vs RevenueCat)
- Handle cancellation for RevenueCat subscriptions
- Call RevenueCat REST API to cancel (via backend)

#### 5.3 Purchase Service Hook
**File**: `lib/hooks/useNativePurchases.ts`

**Purpose**: React hook for managing native purchases

**Functions**:
- `purchaseSubscription(plan: 'monthly' | 'yearly')`
- `restorePurchases()`
- `getSubscriptionStatus()`

### Phase 6: Testing (2-3 days)

1. **Sandbox Testing**
   - Test iOS purchases in TestFlight with sandbox accounts
   - Test Android purchases with test accounts
   - Verify webhook events are received
   - Test subscription renewal
   - Test cancellation flow

2. **Edge Cases**
   - Network failures during purchase
   - Receipt validation failures
   - Webhook delivery failures
   - Subscription expiration handling

3. **Cross-Platform**
   - Test same user on web (Stripe) and mobile (RevenueCat)
   - Ensure subscription status syncs correctly

---

## 📁 Files to Create/Modify

### New Files
- `lib/purchases/native-purchases.ts` - Native purchase service
- `lib/hooks/useNativePurchases.ts` - React hook for purchases
- `app/api/revenuecat/validate-receipt/route.ts` - Receipt validation
- `app/api/revenuecat/webhook/route.ts` - Webhook handler
- `app/api/revenuecat/status/route.ts` - Status check
- `app/api/revenuecat/cancel/route.ts` - Cancel subscription
- `supabase/migrations/20250129_add_revenuecat_columns.sql` - Database migration

### Modified Files
- `app/select-plan/page.tsx` - Add native purchase flow
- `app/(app)/settings/components/SubscriptionPlanSection.tsx` - Show RevenueCat subscriptions
- `app/api/subscription/cancel/route.ts` - Handle RevenueCat cancellations
- `package.json` - Add dependencies
- `capacitor.config.ts` - Configure if needed

---

## 🔐 Security Considerations

1. **Receipt Validation**
   - Always validate receipts server-side
   - Never trust client-side purchase status
   - Use RevenueCat REST API for validation

2. **Webhook Security**
   - Verify webhook signatures from RevenueCat
   - Validate webhook payload structure
   - Handle duplicate webhook deliveries (idempotency)

3. **API Keys**
   - Store RevenueCat API key server-side only
   - Never expose in client code
   - Use environment variables

---

## 📊 Migration Strategy

### For Existing Users
- Users with Stripe subscriptions: Keep using Stripe
- New mobile users: Use RevenueCat
- Web users: Continue using Stripe
- Allow users to switch platforms (web → mobile) by linking accounts

### Data Migration
- No migration needed for existing Stripe subscriptions
- New RevenueCat subscriptions stored alongside Stripe data
- `subscription_platform` field tracks source

---

## ⏱️ Time Estimate

- **Phase 1**: RevenueCat Setup - 1-2 days
- **Phase 2**: Database Updates - 1 day
- **Phase 3**: Capacitor Integration - 2-3 days
- **Phase 4**: Backend APIs - 3-4 days
- **Phase 5**: Frontend Integration - 2-3 days
- **Phase 6**: Testing - 2-3 days

**Total**: 11-16 days (2-3 weeks)

---

## 🚨 Risks & Mitigation

### Risk 1: Capacitor Plugin Limitations
**Risk**: Plugin may not support latest StoreKit/Play Billing features  
**Mitigation**: 
- Research plugin capabilities before starting
- Consider creating custom Capacitor plugin if needed
- Fallback: Use RevenueCat's React Native SDK with Capacitor bridge

### Risk 2: Receipt Validation Complexity
**Risk**: Different receipt formats for iOS/Android  
**Mitigation**: 
- Use RevenueCat REST API (handles complexity)
- Test thoroughly with sandbox receipts

### Risk 3: Webhook Reliability
**Risk**: Webhooks may be delayed or fail  
**Mitigation**: 
- Implement polling fallback for subscription status
- Store webhook events for debugging
- Handle idempotency

---

## ✅ Success Criteria

1. ✅ Users can purchase subscriptions natively on iOS/Android
2. ✅ Subscriptions are validated server-side via RevenueCat
3. ✅ Subscription status syncs correctly to Supabase
4. ✅ Web users continue using Stripe (no breaking changes)
5. ✅ Cancellation works for both Stripe and RevenueCat subscriptions
6. ✅ App Store and Play Store approval (no payment policy violations)

---

## 📚 Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [RevenueCat REST API Reference](https://www.revenuecat.com/reference/receipts)
- [Capacitor In-App Purchases Plugin](https://github.com/capacitor-community/in-app-purchases)
- [Apple StoreKit Documentation](https://developer.apple.com/documentation/storekit)
- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)

---

## 🎯 Next Steps

1. **Research Capacitor Plugin Options**
   - Verify `@capacitor-community/in-app-purchases` supports StoreKit 2
   - Check if alternative plugins exist
   - Test plugin in development environment

2. **Set Up RevenueCat Account**
   - Create account and project
   - Configure App Store Connect connection
   - Configure Google Play Console connection

3. **Create Test Products**
   - Set up sandbox products in App Store Connect
   - Set up test products in Google Play Console
   - Map products in RevenueCat

4. **Start Implementation**
   - Begin with Phase 2 (database updates)
   - Then Phase 3 (Capacitor integration)
   - Follow with backend APIs
   - Finally frontend integration

---

**Status**: Ready to begin implementation  
**Last Updated**: January 2025
