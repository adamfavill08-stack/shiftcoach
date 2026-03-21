# Google Play Console - Subscription Products Setup

**Goal**: Create subscription products that RevenueCat can use for Android in-app purchases.

---

## Prerequisites

- ✅ Google Play Console account access
- ✅ Your app must be created in Google Play Console
- ✅ App must be published (or at least in "Production" track)
- ✅ Google Play Developer account must be active ($25 one-time fee)
- ✅ **Payment Profile must be set up** (see `GOOGLE_PLAY_PAYMENT_PROFILE_SETUP.md`)

---

## Step 1: Navigate to Subscriptions

1. **Go to Google Play Console**
   - https://play.google.com/console
   - Sign in with your Google account

2. **Select Your App**
   - Click on your app: "Shift Coach" (or your app name)

3. **Go to Monetize → Products → Subscriptions**
   - In the left sidebar, click **"Monetize"**
   - Click **"Products"**
   - Click **"Subscriptions"**

---

## Step 2: Create Monthly Subscription

1. **Create New Subscription**
   - Click **"Create subscription"** button (top right)

2. **Product Details**
   - **Product ID**: `shiftcoach_monthly` ⚠️ **Must match exactly - lowercase, no spaces**
   - **Name**: "Shift Coach Monthly"
   - **Description**: 
     ```
     Monthly subscription to Shift Coach. Get personalized sleep, nutrition, and activity guidance tailored to your shift work schedule.
     ```
   - Click **"Save"**

3. **Pricing and Availability**
   - **Billing period**: Select **"1 month"**
   - **Price**: Set to £3.99 (or your chosen price)
   - You can set prices for different countries
   - **Default price**: £3.99/month
   - Click **"Save"**

4. **Free Trial** (Optional but Recommended)
   - **Free trial**: Select **"7 days"** (or your preference)
   - This gives users a 7-day free trial before billing starts
   - Click **"Save"**

5. **Grace Period** (Optional)
   - **Grace period**: Leave default or set to 3 days
   - Allows users time to fix payment issues

6. **Activate Subscription**
   - Review all settings
   - Click **"Activate"** button
   - ⚠️ **Important**: Subscription must be "Active" to work with RevenueCat

---

## Step 3: Create Yearly Subscription

1. **Create Another Subscription**
   - Click **"Create subscription"** again

2. **Product Details**
   - **Product ID**: `shiftcoach_yearly` ⚠️ **Must match exactly**
   - **Name**: "Shift Coach Yearly"
   - **Description**:
     ```
     Yearly subscription to Shift Coach. Save money with our annual plan. Get personalized sleep, nutrition, and activity guidance tailored to your shift work schedule.
     ```
   - Click **"Save"**

3. **Pricing and Availability**
   - **Billing period**: Select **"1 year"**
   - **Price**: Set to £43.00/year (or your chosen price)
   - This should be less than 12x monthly (discount for yearly)
   - Click **"Save"**

4. **Free Trial** (Optional)
   - **Free trial**: Select **"7 days"** (or match monthly)
   - Click **"Save"**

5. **Activate Subscription**
   - Review all settings
   - Click **"Activate"** button

---

## Step 4: Set Up Base Plan (if needed)

**Note**: Google Play uses "Base Plans" for subscriptions. If you see this option:

1. **Create Base Plan**
   - Each subscription needs a base plan
   - Base plan defines: billing period, price, trial period

2. **Configure Base Plan**
   - **Name**: "Monthly Plan" or "Yearly Plan"
   - **Billing period**: 1 month (for monthly) or 1 year (for yearly)
   - **Price**: Set your price
   - **Free trial**: Set if desired
   - Click **"Save"**

3. **Activate Base Plan**
   - Make sure base plan is "Active"

---

## Step 5: Link to RevenueCat

1. **In RevenueCat Dashboard**
   - Go to https://app.revenuecat.com
   - Navigate to **"Integrations"** → **"Google Play"**

2. **Connect Account**
   - Click **"Connect Google Play"**
   - Follow OAuth flow to authorize RevenueCat
   - You'll be redirected to Google to authorize

3. **Select Your App**
   - After authorization, select your app from the list
   - RevenueCat will automatically sync your products

4. **Verify Products**
   - Go to **"Products"** in RevenueCat
   - You should see:
     - `shiftcoach_monthly`
     - `shiftcoach_yearly`
   - Status should be "Active" or "Synced"

---

## Step 6: Create Offerings in RevenueCat

1. **Go to Offerings**
   - In RevenueCat Dashboard → **"Offerings"**

2. **Create Default Offering**
   - Click **"Create Offering"**
   - **Name**: "Default"
   - Make it the **"Current Offering"**

3. **Add Packages**
   - Click **"Add Package"**
   - **Monthly Package**:
     - **Identifier**: `monthly`
     - **Product**: Select `shiftcoach_monthly` (from Google Play)
   - **Yearly Package**:
     - **Identifier**: `yearly`
     - **Product**: Select `shiftcoach_yearly` (from Google Play)

4. **Save Offering**

---

## Step 7: Testing Setup

1. **Create Test Accounts**
   - Google Play Console → **"Monetize"** → **"Products"** → **"Subscriptions"**
   - Click **"License testing"** tab
   - Add test email addresses (Gmail accounts)
   - These accounts can test purchases without being charged

2. **Test Purchase Flow**
   - Install app on test device
   - Sign in with test account
   - Make a test purchase
   - Verify it works correctly

---

## ⚠️ Important Notes

### Product IDs Must Match Exactly
- Google Play: `shiftcoach_monthly`, `shiftcoach_yearly`
- RevenueCat: Same IDs
- Your code: Same IDs (in `lib/purchases/native-purchases.ts`)

### Subscription Status
- Subscriptions must be **"Active"** to work
- Inactive subscriptions won't sync with RevenueCat
- You can deactivate/reactivate later if needed

### First-Time Setup
- If this is your first app, you may need to:
  1. Complete App Information
  2. Upload an APK/AAB (even if just for testing)
  3. Complete Store Listing
  4. Set up pricing and distribution

### Testing
- Use **License Testing** accounts for testing
- Test purchases won't charge real money
- You can test on real devices or emulators

---

## ✅ Checklist

- [ ] Monthly subscription created (`shiftcoach_monthly`)
- [ ] Yearly subscription created (`shiftcoach_yearly`)
- [ ] Both subscriptions are "Active"
- [ ] Pricing set correctly
- [ ] Free trial configured (optional)
- [ ] Google Play linked to RevenueCat
- [ ] Products synced in RevenueCat dashboard
- [ ] Offerings created in RevenueCat
- [ ] Test accounts added for testing

---

## 🐛 Troubleshooting

**"Product ID already exists"**
- Product IDs are unique across all apps
- If you deleted a product, it may still be reserved
- Try a different ID or contact Google Support

**"Subscription not active"**
- Check subscription status in Google Play Console
- Must be "Active" to work with RevenueCat
- Activate the subscription if it's in draft

**Products not syncing in RevenueCat**
- Verify Google Play is connected
- Check subscription status (must be Active)
- Try manual sync in RevenueCat dashboard
- Wait a few minutes for sync to complete

**Can't test purchases**
- Add test accounts in License Testing
- Sign in with test account on device
- Use test account when making purchase

**"App not published"**
- Subscriptions work even if app is in "Internal testing"
- You don't need to publish to production to test subscriptions
- But app must be created and have at least one APK uploaded

---

## 📱 Next Steps After Setup

Once products are created and synced:

1. ✅ **Products Created** - Done!
2. ⏳ **Install Capacitor Plugin** - For native purchase functionality
3. ⏳ **Test Purchase Flow** - Test on Android device/emulator
4. ⏳ **Set Up Webhook** - Configure webhook URL in RevenueCat
5. ⏳ **Publish App** - Upload to Play Store

---

**Ready to continue?** Once your products are created and synced with RevenueCat, we can move on to installing the Capacitor plugin for native purchases!
