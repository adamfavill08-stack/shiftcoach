# Google Play Test Credentials Setup

## The Issue

Google Play detected that your app requires login credentials. They need test account details to review your app.

---

## Quick Fix: Add Test Credentials

### Step 1: Go to App Access Declaration

1. In Play Console, click the **"Update declaration"** button (blue button)
2. Or go to: **Your App → Policy → App access**

---

### Step 2: Fill in Test Credentials

You'll need to provide:

1. **Test Account Type**: Select "Email and password" (or whatever your app uses)

2. **Test Credentials**:
   - **Email**: Create a test email or use: `test@shiftcoach.app` (or similar)
   - **Password**: Create a test password
   - **Additional info**: Any other details needed to access the app

3. **Instructions for Reviewers**:
   ```
   Test account credentials:
   Email: [your test email]
   Password: [your test password]
   
   After login, you can access all features of the app.
   The app requires a subscription to access premium features.
   ```

---

### Step 3: Create a Test Account

**In your app/database:**
1. Create a test user account with the credentials you'll provide
2. Make sure the account works and can access the app
3. Optionally: Give the test account a subscription so reviewers can test premium features

---

### Step 4: Save and Submit

1. Fill in all required fields
2. Click **Save**
3. The issue should disappear
4. Continue with your release

---

## What Google Play Needs

### Required Information:
- ✅ **How to access** the app (login method)
- ✅ **Test credentials** (email/password)
- ✅ **Any special instructions** (if needed)

### Optional but Helpful:
- Instructions for testing premium features
- Any demo/test data
- Special access codes (if any)

---

## Example Test Account Setup

### Create Test User in Your App:
y
1. **Sign up** with test email: `plastore.test@shiftcoach.app`
2. **Password**: `TestPassword123!` (or something secure)
3. **Complete onboarding** (if required)
4. **Activate subscription** (if you want reviewers to test premium features)

### Then Provide to Google:
```
Email: playstore.test@shiftcoach.app
Password: TestPassword123!

Instructions:
- After login, you can access all app features
- The app is fully functional with this test account
- Premium features are available for testing
```

---

## Important Notes

### Security:
- ✅ Use a **dedicated test account** (not your personal account)
- ✅ Use a **strong password** (but one you can share)
- ✅ You can **delete the account later** if needed
- ❌ Don't use your **personal account** credentials

### Best Practices:
- Create the test account **before** submitting
- **Test the credentials** yourself to make sure they work
- Keep the credentials **simple** (easy for reviewers to use)
- Document any **special steps** needed

---

## After Adding Credentials

1. **Save** the declaration
2. The issue should **disappear** from your checks
3. **Continue** with your release submission
4. Google reviewers will use these credentials to test your app

---

## If You Don't Want to Provide Credentials

**Option: Make App Publicly Accessible**
- Remove login requirement (not recommended for your app)
- Or create a "demo mode" that doesn't require login

**But for your app:** Providing test credentials is the standard approach and recommended.

---

## Quick Checklist

- [ ] Create test account in your app
- [ ] Test that credentials work
- [ ] Go to App Access Declaration
- [ ] Fill in test credentials
- [ ] Add instructions (if needed)
- [ ] Save declaration
- [ ] Continue with release

---

## That's It! ✅

Once you provide test credentials, Google Play can review your app and the issue will be resolved!
