# App Store Connect - Subscription Products Setup

**Goal**: Create subscription products that RevenueCat can use for iOS in-app purchases.

---

## Prerequisites

- ✅ App Store Connect account access
- ✅ Your app must be created in App Store Connect
- ✅ App must be in "Prepare for Submission" or later status

---

## Step 1: Navigate to In-App Purchases

1. **Go to App Store Connect**
   - https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Select Your App**
   - Click **"My Apps"**
   - Select your app: "Shift Coach" (or your app name)

3. **Go to Features Tab**
   - Click **"Features"** in the left sidebar
   - Click **"In-App Purchases"**

---

## Step 2: Create Subscription Group

**If you don't have a subscription group yet:**

1. **Click "+" Button**
   - Click the **"+"** button next to "Subscription Groups"
   - Or click **"Create Subscription Group"**

2. **Name the Group**
   - **Reference Name**: "Shift Coach Premium"
   - This is for your reference only (not shown to users)
   - Click **"Create"**

---

## Step 3: Create Monthly Subscription

1. **Add New Subscription**
   - In your subscription group, click **"+"** → **"Auto-Renewable Subscription"**

2. **Product Information**
   - **Product ID**: `shiftcoach_monthly` ⚠️ **Must match exactly - no spaces, lowercase**
   - **Reference Name**: "Shift Coach Monthly"
   - Click **"Create"**

3. **Subscription Duration**
   - Select **"1 Month"**
   - Click **"Next"**

4. **Pricing**
   - Select your price tier
   - **Recommended**: £3.99/month (or equivalent in your region)
   - You can set prices for multiple countries
   - Click **"Next"**

5. **Localizations** (Required)
   - Click **"Add Localization"**
   - **Language**: English (U.S.) or your primary language
   - **Display Name**: "Shift Coach Monthly"
   - **Description**: 
     ```
     Monthly subscription to Shift Coach. Get personalized sleep, nutrition, and activity guidance tailored to your shift work schedule.
     ```
   - Click **"Save"**
   - Add more localizations if needed (optional)

6. **Review Information**
   - Review all details
   - Click **"Save"**

---

## Step 4: Create Yearly Subscription

1. **Add Another Subscription**
   - In the same subscription group, click **"+"** → **"Auto-Renewable Subscription"**

2. **Product Information**
   - **Product ID**: `shiftcoach_yearly` ⚠️ **Must match exactly**
   - **Reference Name**: "Shift Coach Yearly"
   - Click **"Create"**

3. **Subscription Duration**
   - Select **"1 Year"**
   - Click **"Next"**

4. **Pricing**
   - Select your price tier
   - **Recommended**: £43.00/year (or equivalent)
   - This should be less than 12x monthly (discount for yearly)
   - Click **"Next"**

5. **Localizations**
   - Click **"Add Localization"**
   - **Language**: English (U.S.)
   - **Display Name**: "Shift Coach Yearly"
   - **Description**:
     ```
     Yearly subscription to Shift Coach. Save money with our annual plan. Get personalized sleep, nutrition, and activity guidance tailored to your shift work schedule.
     ```
   - Click **"Save"**

6. **Review Information**
   - Review all details
   - Click **"Save"**

---

## Step 5: Set Up Subscription Group Settings

1. **Configure Group**
   - In your subscription group, click **"Edit"** or the group name

2. **Set Display Name**
   - **Display Name**: "Shift Coach Premium"
   - This is shown to users in App Store

3. **Set Subscription Duration Priority** (Optional)
   - You can set which subscription is shown first
   - Typically: Yearly first (better value), then Monthly

4. **Save Changes**

---

## Step 6: Submit for Review

**Important**: Products need to be in "Ready to Submit" status.

1. **Check Product Status**
   - Each subscription should show status: **"Ready to Submit"**
   - If it shows "Missing Metadata", complete all required fields

2. **Submit Products**
   - Select both subscriptions
   - Click **"Submit for Review"**
   - Or submit them with your next app version

3. **Wait for Approval**
   - Apple typically reviews in 24-48 hours
   - You'll receive email notifications

---

## Step 7: Link to RevenueCat

1. **In RevenueCat Dashboard**
   - Go to https://app.revenuecat.com
   - Navigate to **"Integrations"** → **"App Store Connect"**

2. **Connect Account**
   - Click **"Connect App Store Connect"**
   - Follow OAuth flow to authorize RevenueCat
   - You'll be redirected to Apple to authorize

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

## ⚠️ Important Notes

### Product IDs Must Match Exactly
- App Store Connect: `shiftcoach_monthly`, `shiftcoach_yearly`
- RevenueCat: Same IDs
- Your code: Same IDs (in `lib/purchases/native-purchases.ts`)

### Testing
- Use **Sandbox Test Accounts** for testing
- Create test accounts in App Store Connect → Users and Access → Sandbox Testers
- Test purchases won't charge real money

### First-Time Setup
- If this is your first app, you may need to:
  1. Complete App Information
  2. Upload a build (even if just for testing)
  3. Complete App Privacy details
  4. Submit app for review (products can be reviewed together)

---

## ✅ Checklist

- [ ] Subscription group created
- [ ] Monthly subscription created (`shiftcoach_monthly`)
- [ ] Yearly subscription created (`shiftcoach_yearly`)
- [ ] All localizations added
- [ ] Pricing set correctly
- [ ] Products in "Ready to Submit" status
- [ ] Products submitted for review (or ready to submit)
- [ ] App Store Connect linked to RevenueCat
- [ ] Products synced in RevenueCat dashboard

---

## 🐛 Troubleshooting

**"Product ID already exists"**
- Product IDs are unique across all apps
- If you deleted a product, it may still be reserved
- Try a different ID or contact Apple Support

**"Missing Metadata"**
- Complete all required fields (localizations, pricing, etc.)
- Check each tab in the product editor

**Products not syncing in RevenueCat**
- Verify App Store Connect is connected
- Check product status in App Store Connect
- Products must be "Ready to Submit" or "Approved"
- Try manual sync in RevenueCat dashboard

**Can't test purchases**
- Create sandbox test account
- Sign out of App Store on test device
- Use sandbox account when prompted during purchase

---

**Next Step**: Once products are created and synced, we'll configure Google Play Console products.
