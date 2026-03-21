# Setting Up CRON_SECRET_KEY

## Generate a Secure Key

You can generate a secure random key using any of these methods:

### Option 1: Using Node.js (if you have it installed)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option 2: Using OpenSSL (if installed)
```bash
openssl rand -hex 32
```

### Option 3: Using Online Generator
Visit: https://randomkeygen.com/ and use a "CodeIgniter Encryption Keys" (256-bit)

### Option 4: Manual Generation
Any random 64-character hexadecimal string (0-9, a-f)

**Example format:** `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

## Add to Vercel

1. **Go to your Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project

2. **Open Project Settings**
   - Click on your project
   - Go to **Settings** → **Environment Variables**

3. **Add the Variable**
   - Click **Add New**
   - **Name:** `CRON_SECRET_KEY`
   - **Value:** (paste your generated key)
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

4. **Redeploy**
   - After adding the variable, you may need to redeploy for it to take effect
   - Go to **Deployments** → Click the three dots on latest deployment → **Redeploy**

## Add to Local Development (.env.local)

Create or update `.env.local` in your project root:

```env
CRON_SECRET_KEY=your-generated-key-here
```

**Important:** Never commit `.env.local` to git (it should already be in `.gitignore`)

## Verify It's Working

After deployment, you can test the cron job endpoint manually:

```bash
curl -X POST https://your-domain.vercel.app/api/daily-metrics/compute \
  -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
```

Or check Vercel's cron job logs:
- Go to **Deployments** → **Functions** → Look for cron job execution logs

## Security Notes

- Keep this key secret and never commit it to version control
- Use different keys for development, staging, and production if needed
- Rotate the key periodically for security
- The key is only used to authenticate cron job requests, not user data

