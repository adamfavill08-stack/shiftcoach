# Google Play Console - Payment Profile Setup

**Goal**: Set up your payment profile so you can receive payments from subscription sales.

---

## Why You Need a Payment Profile

- ✅ Required to create subscription products
- ✅ Required to receive payments from users
- ✅ Required to set prices for your products
- ✅ Google needs your tax and banking information

---

## Step 1: Navigate to Payment Profile

1. **Go to Google Play Console**
   - https://play.google.com/console
   - Sign in with your Google account

2. **Go to Settings**
   - Click on your profile icon (top right)
   - Click **"Settings"** from the dropdown
   - Or go directly to: https://play.google.com/console/u/0/developers/settings

3. **Go to Payment Profile**
   - In the left sidebar, click **"Payment profile"**
   - Or navigate to: **Settings** → **Payment profile**

---

## Step 2: Complete Account Information

1. **Account Type**
   - Select **"Individual"** or **"Business"**
   - **Individual**: For personal developers
   - **Business**: For companies/organizations
   - ⚠️ **Note**: This affects tax forms and cannot be changed later easily

2. **Contact Information**
   - **Name**: Your full name (or business name)
   - **Email**: Contact email
   - **Phone**: Contact phone number
   - **Address**: Your business/personal address

3. **Tax Information**
   - **Tax ID**: 
     - **Individual**: Your Social Security Number (SSN) or Tax ID
     - **Business**: Your Employer Identification Number (EIN)
   - **Country**: Your country of residence
   - **Tax status**: Select appropriate status

4. **Click "Save"**

---

## Step 3: Set Up Bank Account

1. **Add Bank Account**
   - Click **"Add bank account"** or **"Manage bank accounts"**
   - You'll need:
     - **Account holder name**: Name on bank account
     - **Account number**: Your bank account number
     - **Routing number**: Your bank's routing number (US) or SWIFT/BIC (International)
     - **Bank name**: Your bank's name
     - **Account type**: Checking or Savings

2. **For International Developers**
   - If you're outside the US, you may need:
     - **SWIFT/BIC code**: International bank code
     - **IBAN**: International Bank Account Number (if applicable)
     - **Bank address**: Your bank's address

3. **Verify Bank Account**
   - Google will make small test deposits (usually 2 small amounts)
   - Check your bank account in 1-3 business days
   - Enter the amounts in Google Play Console to verify
   - Or use instant verification if your bank supports it

---

## Step 4: Complete Tax Forms

1. **Tax Information**
   - Google will ask you to complete tax forms
   - **US Developers**: W-9 form (Individual) or W-8BEN (Business)
   - **International Developers**: W-8BEN form

2. **Tax Withholding**
   - Google may withhold taxes based on your country
   - Check your country's tax treaty with the US
   - Some countries have reduced withholding rates

3. **Submit Tax Forms**
   - Complete all required fields
   - Sign electronically
   - Submit for review

---

## Step 5: Set Up Payment Schedule

1. **Payment Threshold**
   - Set minimum payment threshold (e.g., $100)
   - Google will only send payments when you reach this threshold
   - Lower threshold = more frequent payments

2. **Payment Schedule**
   - **Monthly**: Payments sent once per month
   - **Weekly**: Payments sent once per week (if threshold met)
   - Choose based on your preference

3. **Payment Method**
   - **Bank transfer**: Direct deposit to your bank account
   - **Wire transfer**: For international (may have fees)

---

## Step 6: Verify Payment Profile Status

1. **Check Status**
   - Payment profile should show **"Active"** or **"Verified"**
   - If it shows **"Pending"**, wait for Google to review

2. **Common Statuses**
   - **Pending**: Under review (1-3 business days)
   - **Active**: Ready to receive payments
   - **Suspended**: Issues need to be resolved

---

## ⚠️ Important Notes

### Processing Time
- **Bank verification**: 1-3 business days
- **Tax form review**: 1-5 business days
- **Overall setup**: Can take up to 1 week

### Requirements
- ✅ Valid bank account
- ✅ Tax information (SSN/EIN)
- ✅ Complete address
- ✅ Valid contact information

### Payment Delays
- First payment may take 30-45 days after first sale
- Subsequent payments follow your schedule
- Google holds payments for refund period (usually 30 days)

### Currency
- Payments are in your local currency (if supported)
- Or in USD for international developers
- Exchange rates apply for currency conversion

---

## 🐛 Troubleshooting

**"Bank account verification failed"**
- Double-check account number and routing number
- Ensure account is active and accepts deposits
- Contact your bank to verify account details
- Try instant verification if available

**"Tax form rejected"**
- Check all information is correct
- Ensure tax ID matches your account type
- Contact Google Play Support if issues persist

**"Payment profile suspended"**
- Check for any notifications from Google
- Complete any missing information
- Contact Google Play Support

**"Can't add bank account"**
- Ensure you're using the correct account type
- Check if your bank supports ACH transfers (US) or wire transfers (International)
- Some banks may not be supported

---

## ✅ Checklist

- [ ] Account type selected (Individual/Business)
- [ ] Contact information completed
- [ ] Tax information submitted
- [ ] Bank account added
- [ ] Bank account verified (test deposits confirmed)
- [ ] Tax forms completed and submitted
- [ ] Payment threshold set
- [ ] Payment schedule configured
- [ ] Payment profile status: Active/Verified

---

## 📋 What You'll Need

Before starting, gather:
- ✅ Bank account number
- ✅ Bank routing number (US) or SWIFT/BIC (International)
- ✅ Tax ID (SSN for individuals, EIN for businesses)
- ✅ Full legal name (or business name)
- ✅ Complete address
- ✅ Contact email and phone

---

## 🚀 After Payment Profile is Active

Once your payment profile is **Active**:

1. ✅ You can create subscription products
2. ✅ You can set prices
3. ✅ You can receive payments
4. ✅ Continue with subscription product setup

**Next Step**: Go back to `GOOGLE_PLAY_CONSOLE_SETUP.md` and create your subscription products!

---

**Note**: The payment profile setup can take a few days, especially for bank verification. Start this process now, and you can continue with other setup tasks while waiting.
