# RevenueCat Environment Variables Setup

## ✅ Local Setup Complete

Your secret API key has been added to `.env.local`:
```env
REVENUECAT_API_KEY=sk_PSyjwtctjLEYcVmEfFAmYauyjAJBf
```

---

## 🔧 Next: Add to Vercel (Production)

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your project: "shiftcoach" (or your project name)

2. **Navigate to Environment Variables**
   - Go to **Settings** → **Environment Variables**

3. **Add RevenueCat API Key**
   - Click **Add New**
   - **Key**: `REVENUECAT_API_KEY`
   - **Value**: `sk_PSyjwtctjLEYcVmEfFAmYauyjAJBf`
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

4. **Redeploy** (if needed)
   - Vercel will automatically redeploy with the new environment variable
   - Or manually trigger a redeploy from the Deployments tab

---

## ✅ Verification

Once added to Vercel, your backend APIs will be able to:
- ✅ Validate receipts with RevenueCat
- ✅ Handle webhook events
- ✅ Check subscription status

---

## 🔒 Security Reminders

- ✅ Secret key is in `.env.local` (already gitignored)
- ✅ Never commit secret keys to git
- ✅ Only add to Vercel (production) environment variables
- ✅ Keep the key secure and don't share it publicly

---

## 📋 Next Steps

Now that the API key is set up:

1. ✅ **API Key Added** - Done!
2. ⏳ **Configure App Store Connect** - Create subscription products
3. ⏳ **Configure Google Play Console** - Create subscription products
4. ⏳ **Link Stores in RevenueCat** - Connect App Store & Play Store
5. ⏳ **Set Up Webhook** - Configure webhook URL
6. ⏳ **Install Capacitor Plugin** - For native purchases

Ready to continue with product configuration?
