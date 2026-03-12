# Subscription Payment System - How It Works

## 🎯 Overview

Your app uses **two payment systems** depending on platform:
- **Web users**: Stripe Checkout (credit card payments)
- **iOS/Android users**: RevenueCat → App Store/Play Store billing

**You need BOTH** - don't remove Stripe!

---

## 💳 How Payments Work

### Web Users (Stripe)
1. User signs up → Goes to `/select-plan`
2. Selects plan (Monthly/Yearly)
3. Clicks "Start 7-Day Free Trial"
4. Redirected to **Stripe Checkout** page
5. Enters credit card (not charged during trial)
6. After 7 days, Stripe automatically charges
7. Subscription stored in database with `subscription_platform: 'stripe'`

### iOS/Android Users (RevenueCat)
1. User signs up → Goes to `/select-plan`
2. Selects plan (Monthly/Yearly)
3. Clicks "Subscribe"
4. **Native purchase dialog** appears (App Store/Play Store)
5. User confirms with Apple ID/Google account
6. Payment processed by **App Store/Play Store** (not you directly)
7. Receipt sent to RevenueCat for validation
8. Subscription stored in database with `subscription_platform: 'revenuecat_ios'` or `'revenuecat_android'`

---

## 📍 Where Users See Subscription Info

### 1. **Plan Selection Page** (`/select-plan`)
- First page after sign-up
- Shows Monthly/Yearly plans
- Shows 7-day free trial
- **This is where they commit to subscription**

### 2. **Settings Page** (`/settings`)
- Shows current subscription plan
- Shows subscription status (Active/Canceled)
- Shows billing platform (Stripe/App Store/Play Store)
- Cancel subscription button

### 3. **Payment Success Page** (`/payment/success`)
- Shown after Stripe checkout completes
- Confirms subscription activation

---

## 🔒 How Subscription Enforcement Works

### Current Implementation

**The app already checks subscription!** Here's how:

1. **Home Page** (`app/page.tsx`):
   ```typescript
   // If no plan selected, redirect to /select-plan
   if (!profile?.subscription_plan) {
     router.replace('/select-plan')
   }
   ```

2. **Sign In** (`app/auth/sign-in/page.tsx`):
   ```typescript
   // If no plan, redirect to /select-plan
   if (!profile?.subscription_plan) {
     router.replace('/select-plan')
   }
   ```

### What's Missing

**We need to also check `subscription_status`** to ensure it's active:

- ✅ User has `subscription_plan` (monthly/yearly)
- ❌ But we don't check if `subscription_status === 'active'` or `'trialing'`
- ❌ We don't check if subscription expired

---

## 🛠️ What Needs to Be Implemented

### 1. Enhanced Subscription Check

Create a middleware/utility that checks:
- `subscription_plan` exists (monthly/yearly/tester)
- `subscription_status` is 'active' or 'trialing'
- For RevenueCat: Also check expiration date
- For Stripe: Check if subscription is still valid

### 2. Paywall Component

Show a paywall if:
- No subscription plan selected
- Subscription status is 'canceled' or 'past_due'
- Subscription expired

### 3. Subscription Status Check on App Load

- Check subscription status when app loads
- For RevenueCat: Query `/api/revenuecat/status`
- For Stripe: Check Stripe subscription status
- Update database if status changed

---

## 📋 Current Flow

### New User Journey:
1. Sign up → `/auth/sign-up`
2. Sign in → `/auth/sign-in`
3. **Redirected to `/select-plan`** (if no plan)
4. Select plan → Commit to subscription
5. **Web**: Stripe Checkout → 7-day trial starts
6. **Mobile**: Native purchase → 7-day trial starts
7. Redirected to `/onboarding`
8. Complete profile → `/dashboard`

### Existing User Journey:
1. Sign in → `/auth/sign-in`
2. **Check subscription**:
   - If no plan → `/select-plan`
   - If plan exists → `/dashboard` or `/onboarding`

---

## ⚠️ Important Notes

### Stripe vs RevenueCat

**Keep Stripe!** It's needed for:
- Web users (browser access)
- Desktop users
- Users who access via web URL

**RevenueCat is only for:**
- iOS native app (App Store)
- Android native app (Play Store)

### 7-Day Free Trial

**How it works:**
- **Stripe**: Configured in Stripe Checkout (trial period)
- **RevenueCat**: Configured in App Store/Play Store products
- User gets 7 days free, then automatically charged
- During trial: `subscription_status: 'trialing'`
- After trial: `subscription_status: 'active'`

### Subscription Enforcement

**Current state:**
- ✅ Checks if `subscription_plan` exists
- ❌ Doesn't check if subscription is active/valid
- ❌ Doesn't check expiration dates
- ❌ Doesn't show paywall for expired subscriptions

**What to add:**
- Check `subscription_status` in addition to `subscription_plan`
- Show paywall if subscription expired
- Block access to app features if not subscribed

---

## 🔧 Implementation Plan

### Step 1: Create Subscription Check Utility

```typescript
// lib/subscription/checkSubscription.ts
export async function checkSubscriptionStatus(): Promise<{
  hasAccess: boolean
  status: 'active' | 'trialing' | 'expired' | 'none'
  platform: 'stripe' | 'revenuecat_ios' | 'revenuecat_android' | null
}>
```

### Step 2: Update Home Page

Check both `subscription_plan` AND `subscription_status`

### Step 3: Create Paywall Component

Show paywall if subscription expired or canceled

### Step 4: Add Subscription Status Check

On app load, check and update subscription status

---

## ✅ Summary

**Do you need to remove Stripe?**
- ❌ **NO!** Keep Stripe for web users

**How do users pay?**
- **Web**: Stripe Checkout (credit card)
- **iOS/Android**: App Store/Play Store (via RevenueCat)

**Where do they see subscription info?**
- `/select-plan` - Choose plan
- `/settings` - View current subscription
- Payment dialogs (native stores)

**How is subscription enforced?**
- ✅ Currently: Checks if plan exists
- ⚠️ **Needs**: Also check if subscription is active/valid

**7-day free trial:**
- ✅ Already configured in both systems
- User commits to subscription, gets 7 days free, then charged

---

**Next Step**: Implement enhanced subscription checking to ensure users with expired/canceled subscriptions are redirected to paywall.
