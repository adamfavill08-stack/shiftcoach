# Samsung Watch Connection Troubleshooting Guide

## Why Your Samsung Watch Isn't Connecting

ShiftCoach connects to Samsung watches through **Google Fit API**. Your watch must sync data to Google Fit first, then the app reads from Google Fit.

---

## ✅ Prerequisites Checklist

### 1. **Test on a Real Device (Not Emulator)**
- ❌ **Emulators don't have Google Fit** - You can't test watch connections in an emulator
- ✅ **Use a real Android phone** with your Samsung watch paired

### 2. **Watch Must Be Synced with Google Fit**
Your Samsung watch needs to sync its data to Google Fit on your phone:

1. **On your phone**, open **Samsung Health** app
2. Go to **Settings** → **Connected services**
3. Make sure **Google Fit** is connected
4. Enable syncing for:
   - Steps
   - Heart rate
   - Sleep (if available)

**Alternative:** If Samsung Health isn't syncing, install **Google Fit** app directly and pair your watch there.

### 3. **Google Fit OAuth Setup Required**

The app needs Google Fit API credentials. Check if these environment variables are set:

```bash
# Required for Google Fit connection
GOOGLE_FIT_CLIENT_ID=your-client-id
GOOGLE_FIT_CLIENT_SECRET=your-client-secret
GOOGLE_FIT_REDIRECT_URI=https://your-domain.com/api/google-fit/callback
GOOGLE_FIT_REDIRECT_URI_LOCAL=http://localhost:3000/api/google-fit/callback
```

**To get these credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable **Google Fitness API**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URIs:
   - `https://your-domain.com/api/google-fit/callback`
   - `http://localhost:3000/api/google-fit/callback` (for local testing)

### 4. **Connect Google Fit in the App**

After setting up credentials, you need to connect your Google account:

1. **Find the sync button** - Look for "Sync wearables" button in the dashboard header
2. **Or visit directly**: `/api/google-fit/auth` (this redirects to Google OAuth)
3. **Authorize** the app to access Google Fit data
4. **You'll be redirected back** to the dashboard

---

## 🔍 Troubleshooting Steps

### Step 1: Check Environment Variables

```bash
# In your .env.local file, verify these exist:
GOOGLE_FIT_CLIENT_ID=...
GOOGLE_FIT_CLIENT_SECRET=...
GOOGLE_FIT_REDIRECT_URI=...
GOOGLE_FIT_REDIRECT_URI_LOCAL=...
```

**If missing:** The sync will fail with "Google Fit is not configured on the server."

### Step 2: Check if You're Connected

1. Open the app on your phone
2. Look for the **"Sync wearables"** button in the dashboard
3. Click it - if it says "Syncing..." then fails, check the error message
4. Check browser console (if testing in web) or Android logcat for errors

### Step 3: Verify Google Fit Has Data

1. Open **Google Fit** app on your phone
2. Check if it shows steps, heart rate, sleep data
3. **If Google Fit is empty**, your watch isn't syncing to Google Fit
   - Fix: Connect Samsung Health → Google Fit (see Prerequisites #2)

### Step 4: Check Database Connection

The app stores Google Fit tokens in the `google_fit_tokens` table. Verify:

1. Check Supabase dashboard → Table Editor → `google_fit_tokens`
2. Look for a row with your `user_id`
3. If missing, the OAuth connection didn't complete

### Step 5: Test the Sync Endpoint

Try manually calling the sync endpoint:

```bash
# In your app, open browser console and run:
fetch('/api/wearables/sync', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected responses:**
- ✅ `{ lastSyncedAt: "...", steps: 1234 }` - Success!
- ❌ `{ error: "no_google_fit_connection" }` - Not connected, need to authenticate
- ❌ `{ error: "google_fit_token_error" }` - Database issue

---

## 🚨 Common Issues & Fixes

### Issue: "Google Fit is not configured on the server"
**Fix:** Add environment variables (see Prerequisites #3)

### Issue: "No Google Fit tokens for user"
**Fix:** You haven't connected your Google account. Visit `/api/google-fit/auth` to connect.

### Issue: Sync button does nothing
**Fix:** 
- Check browser console for errors
- Verify you're on a real device (not emulator)
- Make sure you're logged in

### Issue: Watch syncs to Samsung Health but not Google Fit
**Fix:** 
- Open Samsung Health → Settings → Connected services
- Connect to Google Fit
- Or install Google Fit app and pair watch there

### Issue: Testing on emulator
**Fix:** Google Fit doesn't work in emulators. You **must** test on a real Android device.

### Issue: OAuth redirect fails
**Fix:** 
- Check `GOOGLE_FIT_REDIRECT_URI` matches exactly what's in Google Cloud Console
- For local testing, use `GOOGLE_FIT_REDIRECT_URI_LOCAL`
- Make sure the redirect URI is added to Google Cloud Console OAuth settings

---

## 📱 Testing Checklist

- [ ] Using a **real Android device** (not emulator)
- [ ] Samsung watch is **paired** with phone
- [ ] Watch data **syncs to Google Fit** (check Google Fit app)
- [ ] Google Fit API credentials are set in `.env.local`
- [ ] OAuth redirect URIs match Google Cloud Console
- [ ] Connected Google account via `/api/google-fit/auth`
- [ ] `google_fit_tokens` table has your user's tokens
- [ ] Sync button works and shows "Synced" status

---

## 🔗 Quick Links

- **Connect Google Fit**: Visit `/api/google-fit/auth` in your app
- **Check sync status**: Click "Sync wearables" button in dashboard
- **Google Cloud Console**: https://console.cloud.google.com/
- **Google Fit API Docs**: https://developers.google.com/fit/rest

---

## 💡 Pro Tips

1. **Test the full flow**: Connect → Sync → Check data appears in app
2. **Check logs**: Look at browser console and server logs for detailed errors
3. **Token expiry**: Google Fit tokens expire - the app should auto-refresh, but if sync fails, try reconnecting
4. **Multiple devices**: Each device needs to be connected separately if testing on multiple phones

---

## Still Not Working?

If you've checked everything above and it's still not working:

1. **Check server logs** for detailed error messages
2. **Check browser console** for client-side errors
3. **Verify Google Fit API is enabled** in Google Cloud Console
4. **Test with Google Fit app directly** - if that doesn't show watch data, the issue is with watch → Google Fit sync, not the app

