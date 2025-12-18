# How to Set Up Cron Secrets in Vercel - Step by Step

## Step 1: Generate Your Secret Keys

You need to generate **2 random secret keys**. Here are 3 easy ways to do it:

### **Option A: Online Generator (Easiest)**
1. Go to: https://randomkeygen.com/
2. Find the section: **"CodeIgniter Encryption Keys"**
3. Click the **copy** button next to any key
4. This gives you a 64-character random string
5. Do this **twice** (once for each secret)

### **Option B: Using PowerShell (Windows)**
Open PowerShell and run:
```powershell
-join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})
```
Run this **twice** to get 2 different keys.

### **Option C: Using WSL/Ubuntu Terminal**
If you have WSL open, run:
```bash
openssl rand -hex 32
```
Run this **twice** to get 2 different keys.

---

## Step 2: Go to Vercel Dashboard

1. Open your browser
2. Go to: **https://vercel.com/dashboard**
3. Sign in if needed
4. Click on your **Shift Coach** project

---

## Step 3: Open Environment Variables

1. In your project, click **Settings** (top navigation bar)
2. In the left sidebar, click **Environment Variables**

You should now see a list of your environment variables (or an empty list if you haven't added any yet).

---

## Step 4: Add CRON_SECRET_KEY

1. Click the **"Add New"** button (usually top right)
2. In the **Name** field, type exactly: `CRON_SECRET_KEY`
   - ⚠️ Must be exact: uppercase, underscores, no spaces
3. In the **Value** field, paste your first generated key
   - Should be 64 characters long (letters and numbers)
4. Under **Environment**, check:
   - ✅ **Production** (required)
   - ✅ **Preview** (recommended)
   - ⬜ **Development** (optional)
5. Click **Save**

---

## Step 5: Add WEEKLY_SUMMARY_SECRET

1. Click **"Add New"** again
2. In the **Name** field, type exactly: `WEEKLY_SUMMARY_SECRET`
3. In the **Value** field, paste your **second** generated key (different from the first one!)
4. Under **Environment**, check:
   - ✅ **Production** (required)
   - ✅ **Preview** (recommended)
   - ⬜ **Development** (optional)
5. Click **Save**

---

## Step 6: Verify They're Added

You should now see both variables in your list:
- ✅ `CRON_SECRET_KEY` - with a green checkmark
- ✅ `WEEKLY_SUMMARY_SECRET` - with a green checkmark

---

## Step 7: Redeploy Your App

**Important:** After adding environment variables, you MUST redeploy for them to take effect.

1. Click **Deployments** (top navigation)
2. Find your latest deployment
3. Click the **three dots** (⋯) on the right side
4. Click **Redeploy**
5. Wait for deployment to complete (usually 1-2 minutes)

---

## ✅ You're Done!

After redeployment:
- Your cron jobs will be protected with these secrets
- The app will use these keys to authenticate scheduled tasks
- You can check Vercel logs to see cron jobs running

---

## 🔍 How to Verify It's Working

1. **Check Vercel Logs:**
   - Go to: Deployments → Latest → Functions
   - Look for cron job execution logs
   - Should see successful runs

2. **Test Manually (Optional):**
   ```bash
   curl -X POST https://your-app.vercel.app/api/daily-metrics/compute \
     -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
   ```
   Should return success (not "Unauthorized")

---

## ⚠️ Important Notes

- **Keep these keys secret** - Never share them or commit to git
- **Use different keys** - Don't use the same key for both variables
- **Don't change them** - Once set, only change if you suspect a security issue
- **Redeploy required** - Always redeploy after adding/updating variables

---

## 🆘 Troubleshooting

**Problem:** "Unauthorized" error when cron runs
- **Solution:** Check that `CRON_SECRET_KEY` is set correctly in Vercel

**Problem:** Variables not showing up
- **Solution:** Make sure you clicked "Save" and check the correct environment

**Problem:** Cron jobs not running
- **Solution:** 
  1. Verify variables are set
  2. Redeploy the app
  3. Check Vercel cron configuration in `vercel.json`

---

**Need help?** Check the full `VERCEL_SETUP_GUIDE.md` for more details!

