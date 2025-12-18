# Stripe Payment Setup Guide

## Overview
Payment setup is now integrated. When users select a plan (monthly or yearly), they're redirected to Stripe Checkout to set up payment.

## Setup Steps

### 1. Install Stripe Package
```bash
npm install stripe
```
✅ Already done!

### 2. Get Stripe API Keys

1. **Sign up/Login to Stripe**: https://dashboard.stripe.com
2. **Get your API keys**:
   - Go to Developers → API keys
   - Copy your **Secret key** (starts with `sk_`)
   - Copy your **Publishable key** (starts with `pk_`)

### 3. Set Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PRICE_ID_MONTHLY=price_... (Monthly plan price ID)
STRIPE_PRICE_ID_YEARLY=price_... (Yearly plan price ID)
```

### 4. Create Products & Prices in Stripe

1. Go to Stripe Dashboard → Products
2. **Create Monthly Product**:
   - Name: "ShiftCoach Monthly"
   - Price: £3.99
   - Billing period: Monthly
   - Copy the **Price ID** (starts with `price_`)
   - Add to `STRIPE_PRICE_ID_MONTHLY` in `.env.local`

3. **Create Yearly Product**:
   - Name: "ShiftCoach Yearly"
   - Price: £43.00
   - Billing period: Yearly
   - Copy the **Price ID** (starts with `price_`)
   - Add to `STRIPE_PRICE_ID_YEARLY` in `.env.local`

### 5. Set Up Webhook (Optional but Recommended)

For production, set up a webhook to handle subscription events:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/payment/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_`)
6. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 6. Run Database Migration

Run the migration to add Stripe columns:
```sql
-- File: supabase/migrations/20250127_add_subscription_plan.sql
```

This adds:
- `stripe_customer_id` - Stripe customer ID
- `stripe_subscription_id` - Stripe subscription ID
- `subscription_status` - active, canceled, past_due, etc.

## User Flow

1. **User selects plan** → `/select-plan`
2. **Clicks "Start 7-Day Free Trial"**
3. **Redirected to Stripe Checkout** → Payment setup
4. **After payment** → Redirected to `/payment/success`
5. **Payment verified** → Plan saved to profile
6. **Redirected to onboarding** → `/onboarding`

## Tester Codes

Tester codes **skip payment** and go directly to onboarding.

## Testing

### Test Mode
- Use Stripe test keys (`sk_test_...`, `pk_test_...`)
- Use test card: `4242 4242 4242 4242`
- Any future expiry date, any CVC

### Production
- Use Stripe live keys (`sk_live_...`, `pk_live_...`)
- Real payments will be processed

## Troubleshooting

### "Failed to create checkout session"
- Check Stripe keys are correct
- Check price IDs exist in Stripe
- Check environment variables are loaded

### "Payment verification failed"
- Check webhook is set up (for production)
- Check database migration ran
- Check user is authenticated

## Next Steps

1. ✅ Install Stripe package
2. ⏳ Get Stripe API keys
3. ⏳ Create products/prices in Stripe
4. ⏳ Add environment variables
5. ⏳ Run database migration
6. ⏳ Test payment flow
7. ⏳ Set up webhook (production)

