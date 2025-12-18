# Tester Feedback Setup Guide

## ✅ What's Been Added

1. **Tester Feedback Section** in Settings menu
   - Located at: `app/(app)/settings/components/TesterFeedbackSection.tsx`
   - Accessible from Settings page

2. **Feedback API Route**
   - Located at: `app/api/feedback/route.ts`
   - Handles form submission and sends emails

---

## 📧 Email Setup Options

### **Option 1: Resend (Recommended)**

Resend is the easiest and most reliable option for sending emails from Next.js.

#### Step 1: Install Resend
```bash
npm install resend
```

#### Step 2: Get Your Resend API Key
1. Go to https://resend.com
2. Sign up for a free account (100 emails/day free)
3. Go to **API Keys** section
4. Create a new API key
5. Copy the key (starts with `re_`)

#### Step 3: Set Up Domain (Optional but Recommended)
1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `shiftcoach.app`)
3. Add the DNS records they provide
4. Wait for verification (usually a few minutes)

#### Step 4: Add Environment Variables

**Local Development (`.env.local`):**
```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=ShiftCoach <feedback@shiftcoach.app>
```

**Vercel (Production):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `RESEND_API_KEY` = `re_your_api_key_here`
   - `RESEND_FROM_EMAIL` = `ShiftCoach <feedback@shiftcoach.app>`
3. Select **Production**, **Preview**, and **Development** environments
4. Click **Save**
5. Redeploy your app

---

### **Option 2: Email Webhook (Alternative)**

If you prefer a different email service, you can use a webhook:

1. Set up a webhook service (e.g., Zapier, Make.com, or custom endpoint)
2. Add to `.env.local`:
   ```env
   EMAIL_WEBHOOK_URL=https://your-webhook-url.com/send-email
   ```
3. The webhook should accept POST requests with:
   ```json
   {
     "to": "adam.favill@outlook.com",
     "from": "user@example.com",
     "subject": "[ShiftCoach Feedback] Subject",
     "text": "Message content"
   }
   ```

---

## 🧪 Testing

### Test Locally:
1. Start your dev server: `npm run dev`
2. Go to Settings page
3. Click "Tester Feedback" section
4. Fill in the form and submit
5. Check your email (adam.favill@outlook.com) for the feedback

### Test in Production:
1. Deploy to Vercel with environment variables set
2. Go to Settings in your deployed app
3. Submit test feedback
4. Check your email

---

## 📝 How It Works

1. User fills out the feedback form in Settings
2. Form submits to `/api/feedback`
3. API validates the request and user authentication
4. Email is sent to `adam.favill@outlook.com` with:
   - Subject: `[ShiftCoach Feedback] {user's subject}`
   - Body: Includes user email, user ID, date, and message
   - Reply-To: Set to user's email (so you can reply directly)

---

## 🔧 Troubleshooting

### "Failed to send email" error:
- Check that `RESEND_API_KEY` is set correctly
- Verify the API key is active in Resend dashboard
- Check Resend dashboard for any errors or rate limits

### Email not received:
- Check spam folder
- Verify the email address is correct: `adam.favill@outlook.com`
- Check Resend dashboard → Logs for delivery status
- Make sure domain is verified (if using custom domain)

### "No email service configured" warning:
- This appears in console logs if neither Resend nor webhook is configured
- Install Resend and set `RESEND_API_KEY` to fix

---

## 💡 Tips

- **Free Tier**: Resend gives 100 emails/day for free (perfect for testing)
- **Domain Verification**: Using a verified domain improves deliverability
- **Reply-To**: The user's email is set as reply-to, so you can reply directly
- **Rate Limiting**: Resend has rate limits, but they're generous for normal use

---

## 🚀 Next Steps

1. Install Resend: `npm install resend`
2. Get API key from https://resend.com
3. Add `RESEND_API_KEY` to `.env.local` and Vercel
4. Test the feedback form
5. Check your email!

