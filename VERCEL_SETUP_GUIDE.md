# Vercel Setup Guide - Shift Coach

**Complete checklist for setting up your app in Vercel**

---

## 🔴 **CRITICAL - Must Set These**

### 1. **Supabase Variables** (Required)
These are essential for the app to work:

- **`NEXT_PUBLIC_SUPABASE_URL`**
  - Get from: Supabase Dashboard → Project Settings → API
  - Format: `https://xxxxx.supabase.co`
  - **Environment:** Production, Preview, Development

- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
  - Get from: Supabase Dashboard → Project Settings → API
  - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - **Environment:** Production, Preview, Development

- **`SUPABASE_SERVICE_ROLE_KEY`**
  - Get from: Supabase Dashboard → Project Settings → API
  - ⚠️ **Keep this secret!** Never expose in client-side code
  - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - **Environment:** Production, Preview, Development

---

### 2. **OpenAI API Key** (Required for AI Coach)
- **`OPENAI_API_KEY`**
  - Get from: https://platform.openai.com/api-keys
  - Format: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
  - ⚠️ **Important:** Use the raw key, NO "Bearer " prefix, NO quotes, NO spaces
  - **Environment:** Production, Preview, Development

---

## 🟡 **IMPORTANT - Should Set These**

### 3. **Cron Job Secrets** (For scheduled tasks)

- **`CRON_SECRET_KEY`**
  - Generate a secure random key (see instructions below)
  - Used to protect cron endpoints from unauthorized access
  - **Environment:** Production only (or all if you want)

- **`WEEKLY_SUMMARY_SECRET`**
  - Generate another secure random key
  - Used for weekly summary cron job
  - **Environment:** Production only (or all if you want)

**How to generate secure keys:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Online
Visit: https://randomkeygen.com/ (use "CodeIgniter Encryption Keys")
```

---

## 🟢 **OPTIONAL - Nice to Have**

### 4. **USDA API Key** (Optional - for food database)
- **`USDA_API_KEY`**
  - Get from: https://fdc.nal.usda.gov/api-guide.html
  - Only needed if you're using USDA food database features
  - **Environment:** Production, Preview, Development (if using)

---

## 📋 **Step-by-Step Instructions**

### **Step 1: Go to Vercel Dashboard**
1. Visit: https://vercel.com/dashboard
2. Click on your **Shift Coach** project

### **Step 2: Open Environment Variables**
1. Click **Settings** (top navigation)
2. Click **Environment Variables** (left sidebar)

### **Step 3: Add Each Variable**

For each variable below:

1. Click **Add New**
2. Enter the **Name** (exactly as shown)
3. Enter the **Value** (copy from your source)
4. Select **Environment(s)**:
   - ✅ Production (required)
   - ✅ Preview (recommended)
   - ✅ Development (optional, for local testing)
5. Click **Save**

---

## ✅ **Complete Checklist**

Copy this checklist and check off each item:

### **Supabase (Required)**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Set to your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Set to your Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Set to your Supabase service role key

### **OpenAI (Required for AI)**
- [ ] `OPENAI_API_KEY` - Set to your OpenAI API key (raw key, no "Bearer " prefix)

### **Cron Secrets (Important)**
- [ ] `CRON_SECRET_KEY` - Generated secure random key
- [ ] `WEEKLY_SUMMARY_SECRET` - Generated secure random key

### **Optional**
- [ ] `USDA_API_KEY` - Only if using USDA food database

---

## 🔍 **How to Verify**

### **1. Check Variables Are Set**
- Go to Vercel → Your Project → Settings → Environment Variables
- You should see all variables listed
- ✅ Green checkmark = Set
- ❌ Red X = Missing

### **2. Test in Production**
After setting variables, redeploy:

1. Go to **Deployments**
2. Click the **three dots** (⋯) on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### **3. Test Key Features**

**Test AI Coach:**
- Open the app
- Click the Shift Coach chat bubble
- Send a message
- ✅ Should get AI response
- ❌ If error: Check `OPENAI_API_KEY` format (no "Bearer " prefix)

**Test Database:**
- Try to log sleep
- Try to view dashboard
- ✅ Should load data
- ❌ If error: Check Supabase variables

**Test Cron Jobs (if set up):**
- Check Vercel logs for cron job executions
- Should see successful runs at scheduled times

---

## ⚠️ **Common Issues**

### **Issue 1: "OPENAI_API_KEY is not a legal HTTP header value"**
**Cause:** Key has "Bearer " prefix or extra characters  
**Fix:** 
- Remove "Bearer " prefix
- Remove quotes
- Remove spaces
- Use only the raw key: `sk-proj-xxxxx...`

### **Issue 2: "Auth session missing"**
**Cause:** Supabase variables not set correctly  
**Fix:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Redeploy after setting variables

### **Issue 3: "Missing SUPABASE_SERVICE_ROLE_KEY"**
**Cause:** Service role key not set  
**Fix:**
- Add `SUPABASE_SERVICE_ROLE_KEY` in Vercel
- Make sure it's the **service_role** key, not the anon key
- Redeploy

### **Issue 4: Cron jobs not running**
**Cause:** Secret keys not set or incorrect  
**Fix:**
- Verify `CRON_SECRET_KEY` is set
- Verify `WEEKLY_SUMMARY_SECRET` is set
- Check Vercel cron configuration in `vercel.json`

---

## 🔐 **Security Best Practices**

1. **Never commit secrets to git**
   - All these variables should be in Vercel only
   - `.env.local` is for local development only

2. **Use different keys for different environments** (optional)
   - Production: Use production keys
   - Preview: Use test keys
   - Development: Use dev keys

3. **Rotate keys periodically**
   - Especially if you suspect a breach
   - Update in Vercel and redeploy

4. **Limit access**
   - Only add team members who need access
   - Use Vercel's team permissions

---

## 📝 **Quick Reference**

### **Where to Find Your Keys:**

**Supabase:**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: **Settings** → **API**
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

**OpenAI:**
1. Go to: https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy the key → `OPENAI_API_KEY`
4. ⚠️ Save it immediately (you can't see it again!)

**Generate Random Keys:**
```bash
# For CRON_SECRET_KEY and WEEKLY_SUMMARY_SECRET
openssl rand -hex 32
```

---

## ✅ **Final Checklist**

Before launching:

- [ ] All required variables are set in Vercel
- [ ] Variables are set for Production environment
- [ ] Redeployed after setting variables
- [ ] Tested AI Coach (works)
- [ ] Tested database operations (work)
- [ ] Checked Vercel logs for errors
- [ ] Verified no secrets are in git

---

## 🆘 **Need Help?**

If something's not working:

1. **Check Vercel Logs:**
   - Go to: Deployments → Latest → Functions
   - Look for error messages

2. **Check Variable Names:**
   - Must match exactly (case-sensitive)
   - No typos
   - No extra spaces

3. **Redeploy:**
   - Sometimes variables need a redeploy to take effect
   - Go to Deployments → Redeploy

4. **Test Locally First:**
   - Set variables in `.env.local`
   - Test locally
   - Then set in Vercel

---

**Last Updated:** Current  
**Status:** Ready for production setup

