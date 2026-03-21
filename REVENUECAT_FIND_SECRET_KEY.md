# How to Find Your RevenueCat Secret API Key

## ⚠️ Important: Public vs Secret Keys

- **Public Key** (starts with `test_` or `pk_`): Used in client-side apps (iOS/Android SDK)
- **Secret Key** (starts with `sk_`): Used in backend/server-side (for webhooks, receipt validation)

**We need the SECRET key for backend integration!**

---

## Steps to Find Secret API Key

1. **In RevenueCat Dashboard**
   - You're currently on the "Install the SDK" page
   - Click **"Go to dashboard"** button (bottom left)

2. **Navigate to Project Settings**
   - In the left sidebar, click **"Project Settings"** (gear icon)
   - Or go to: https://app.revenuecat.com → Your Project → Settings

3. **Go to API Keys Section**
   - Scroll down to **"API Keys"** section
   - You'll see:
     - **Public API Key** (starts with `test_` or `pk_`) - This is what you saw
     - **Secret API Key** (starts with `sk_`) - This is what we need!

4. **Copy the Secret Key**
   - Click the copy icon next to the Secret API Key
   - It will look like: `sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

5. **Add to Environment Variables**
   - Add to `.env.local`:
     ```env
     REVENUECAT_API_KEY=sk_your_secret_key_here
     ```
   - Add to Vercel: Settings → Environment Variables → Add `REVENUECAT_API_KEY`

---

## Quick Navigation

**Direct URL to API Keys:**
- https://app.revenuecat.com → Your Project → Settings → API Keys

**Or:**
- Dashboard → Project Settings (gear icon) → API Keys section

---

## Security Note

⚠️ **Never commit the secret key to git!**
- It's already in `.gitignore` (`.env.local` is ignored)
- Only add it to `.env.local` (local) and Vercel (production)
- The public key (`test_...`) is safe to use in client code

---

Once you have the secret key, let me know and I'll help you:
1. Add it to environment variables
2. Test the connection
3. Continue with product configuration
