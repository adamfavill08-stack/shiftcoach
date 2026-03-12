# RevenueCat Quick Start Guide

**Status**: Account created ✅  
**Next**: Configure products and get API key

---

## Step 1: Get Your RevenueCat API Key

1. **Log into RevenueCat Dashboard**
   - Go to https://app.revenuecat.com
   - Select your project: "Shift Coach"

2. **Get Your Secret API Key**
   - Go to **Project Settings** → **API Keys**
   - Copy your **Secret API Key** (starts with `sk_`)
   - ⚠️ **Keep this secret!** Never commit it to git.

3. **Add to Environment Variables**
   Add this to your `.env.local` file:
   ```env
   REVENUECAT_API_KEY=sk_your_secret_key_here
   ```

   And add it to Vercel:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `REVENUECAT_API_KEY` with your secret key
   - Redeploy after adding

---

## Step 2: Configure App Store Connect (iOS)

### 2.1 Create Subscription Products

1. **Go to App Store Connect**
   - https://appstoreconnect.apple.com
   - Select your app → **Features** → **In-App Purchases**

2. **Create Subscription Group** (if not exists)
   - Click **+** → **Subscription Group**
   - Name: "Shift Coach Premium"
   - Click **Create**

3. **Create Monthly Subscription**
   - Click **+** → **Auto-Renewable Subscription**
   - **Product ID**: `shiftcoach_monthly` ⚠️ **Must match exactly**
   - **Reference Name**: "Shift Coach Monthly"
   - **Subscription Duration**: 1 Month
   - **Price**: £3.99/month (or your chosen price)
   - **Localizations**: Add description
   - Click **Create**

4. **Create Yearly Subscription**
   - Click **+** → **Auto-Renewable Subscription**
   - **Product ID**: `shiftcoach_yearly` ⚠️ **Must match exactly**
   - **Reference Name**: "Shift Coach Yearly"
   - **Subscription Duration**: 1 Year
   - **Price**: £43.00/year (or your chosen price)
   - **Localizations**: Add description
   - Click **Create**

5. **Submit for Review** (if needed)
   - Products need to be in "Ready to Submit" status
   - May need to submit app for review if first time

### 2.2 Link to RevenueCat

1. **In RevenueCat Dashboard**
   - Go to **Integrations** → **App Store Connect**
   - Click **Connect App Store Connect**
   - Follow OAuth flow to authorize RevenueCat

2. **Select Your App**
   - Choose your app from the list
   - RevenueCat will sync products automatically

---

## Step 3: Configure Google Play Console (Android)

### 3.1 Create Subscription Products

1. **Go to Google Play Console**
   - https://play.google.com/console
   - Select your app → **Monetize** → **Products** → **Subscriptions**

2. **Create Monthly Subscription**
   - Click **Create subscription**
   - **Product ID**: `shiftcoach_monthly` ⚠️ **Must match exactly**
   - **Name**: "Shift Coach Monthly"
   - **Billing period**: 1 month
   - **Price**: £3.99/month (or your chosen price)
   - **Free trial**: Optional (e.g., 7 days)
   - Click **Save**

3. **Create Yearly Subscription**
   - Click **Create subscription**
   - **Product ID**: `shiftcoach_yearly` ⚠️ **Must match exactly**
   - **Name**: "Shift Coach Yearly"
   - **Billing period**: 1 year
   - **Price**: £43.00/year (or your chosen price)
   - **Free trial**: Optional (e.g., 7 days)
   - Click **Save**

4. **Activate Products**
   - Products must be **Active** status
   - May need to publish app first

### 3.2 Link to RevenueCat

1. **In RevenueCat Dashboard**
   - Go to **Integrations** → **Google Play**
   - Click **Connect Google Play**
   - Follow OAuth flow to authorize RevenueCat

2. **Select Your App**
   - Choose your app from the list
   - RevenueCat will sync products automatically

---

## Step 4: Create Offerings in RevenueCat

1. **Go to RevenueCat Dashboard**
   - Navigate to **Offerings**

2. **Create Default Offering**
   - Click **Create Offering**
   - Name: "Default"
   - Make it the **Current Offering**

3. **Add Packages**
   - Click **Add Package**
   - **Monthly Package**:
     - Identifier: `monthly`
     - Product: `shiftcoach_monthly` (from App Store/Play Store)
   - **Yearly Package**:
     - Identifier: `yearly`
     - Product: `shiftcoach_yearly` (from App Store/Play Store)

---

## Step 5: Set Up Webhook

1. **In RevenueCat Dashboard**
   - Go to **Project Settings** → **Webhooks**

2. **Add Webhook URL**
   - URL: `https://www.shiftcoach.app/api/revenuecat/webhook`
   - ⚠️ **Must be HTTPS** (production URL)

3. **Select Events**
   Check these events:
   - ✅ `INITIAL_PURCHASE`
   - ✅ `RENEWAL`
   - ✅ `CANCELLATION`
   - ✅ `BILLING_ISSUE`
   - ✅ `SUBSCRIPTION_PAUSED` (if applicable)
   - ✅ `SUBSCRIPTION_RESUMED` (if applicable)

4. **Save Webhook**
   - Click **Save**
   - Copy the **Webhook Secret** (if provided)
   - Add to environment variables:
     ```env
     REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
     ```

---

## Step 6: Environment Variables Checklist

Add these to `.env.local` and Vercel:

```env
# RevenueCat
REVENUECAT_API_KEY=sk_your_secret_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here (optional but recommended)

# Keep existing Stripe for web
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
```

---

## Step 7: Test Webhook (Optional)

Once webhook is set up, you can test it:

1. **In RevenueCat Dashboard**
   - Go to **Webhooks** → Click on your webhook
   - Click **Send Test Event**
   - Check your server logs to see if it received the event

2. **Check Server Logs**
   - Look for `[api/revenuecat/webhook]` in your logs
   - Should see "Received event" messages

---

## ⚠️ Important Notes

1. **Product IDs Must Match**
   - App Store: `shiftcoach_monthly`, `shiftcoach_yearly`
   - Google Play: `shiftcoach_monthly`, `shiftcoach_yearly`
   - RevenueCat: Same IDs

2. **Webhook URL**
   - Must be production URL (HTTPS)
   - For local testing, use ngrok or similar
   - Webhook will only work in production

3. **App Status**
   - Products need to be approved/active in stores
   - First-time apps may need review before products work

4. **Testing**
   - Use sandbox/test accounts for testing
   - Real purchases only work in production

---

## Next Steps After Setup

Once you've completed these steps:

1. ✅ RevenueCat account created
2. ⏳ Get API key and add to environment variables
3. ⏳ Configure App Store Connect products
4. ⏳ Configure Google Play Console products
5. ⏳ Link stores in RevenueCat
6. ⏳ Create offerings in RevenueCat
7. ⏳ Set up webhook
8. ⏳ Install Capacitor plugin (next phase)

---

**Current Status**: Account created ✅  
**Next Action**: Get API key and configure products
