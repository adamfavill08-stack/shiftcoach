# Namecheap Email Forwarding Setup Guide

## Step-by-Step Instructions

### Step 1: Log into Namecheap
1. Go to [namecheap.com](https://www.namecheap.com)
2. Click **Sign In** (top right)
3. Enter your credentials and log in

### Step 2: Access Domain List
1. Once logged in, click on **Domain List** in the left sidebar (or go to your account dashboard)
2. Find `shiftcoach.app` in your domain list
3. Click the **Manage** button next to it

### Step 3: Navigate to Email Forwarding
1. In the domain management page, look for **Email Forwarding** section
2. You might see it as:
   - A tab at the top: **Email Forwarding**
   - A section in the left sidebar
   - Under **Advanced DNS** → **Email Forwarding**

### Step 4: Add Email Forwarding Rules

You need to create 3 forwarding rules:

#### Forwarding Rule 1: Privacy Email
1. Click **Add Forwarding** or **Create New Forward**
2. **Forward from:** `privacy`
3. **Forward to:** `shift-coach@outlook.com`
4. Click **Save** or **Add**

#### Forwarding Rule 2: Legal Email
1. Click **Add Forwarding** or **Create New Forward**
2. **Forward from:** `legal`
3. **Forward to:** `shift-coach@outlook.com`
4. Click **Save** or **Add**

#### Forwarding Rule 3: Health Data Email
1. Click **Add Forwarding** or **Create New Forward**
2. **Forward from:** `healthdata`
3. **Forward to:** `shift-coach@outlook.com`
4. Click **Save** or **Add**

---

## Alternative: Using Advanced DNS (If Email Forwarding Section Not Available)

If you don't see an "Email Forwarding" section, you can use MX records:

1. Go to **Advanced DNS** tab
2. Look for **Mail Settings** section
3. Enable **Email Forwarding** (if there's a toggle)
4. Then follow Step 4 above

---

## Verification

After setting up forwarding:

1. **Wait 5-15 minutes** for DNS propagation
2. Send a test email to `privacy@shiftcoach.app` from a different email account
3. Check your `shift-coach@outlook.com` inbox
4. Repeat for `legal@shiftcoach.app` and `healthdata@shiftcoach.app`

---

## Troubleshooting

### "Email Forwarding Not Available"
- Some domains may need to enable email forwarding first
- Check if there's a toggle or enable button
- Contact Namecheap support if it's not available

### "Emails Not Arriving"
- Wait up to 24 hours for DNS propagation
- Check spam/junk folder in Outlook
- Verify the forwarding address is correct
- Make sure `shift-coach@outlook.com` is a valid, active email

### "Can't Find Email Forwarding Section"
- Try the **Advanced DNS** tab
- Look for **Mail Settings** or **Email** section
- Contact Namecheap support for help

---

## Namecheap Support

If you need help:
- **Live Chat:** Available on Namecheap website
- **Support Ticket:** Submit through your account
- **Knowledge Base:** Search "email forwarding" on Namecheap

---

## Quick Reference

**Email Addresses to Forward:**
- `privacy@shiftcoach.app` → `shift-coach@outlook.com`
- `legal@shiftcoach.app` → `shift-coach@outlook.com`
- `healthdata@shiftcoach.app` → `shift-coach@outlook.com`

**Expected Setup Time:** 5-10 minutes  
**DNS Propagation:** 5 minutes to 24 hours (usually within 15 minutes)

