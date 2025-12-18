# Namecheap Email Forwarding Troubleshooting

## Issue: "Your domain is using other email service"

This message appears when Namecheap detects that your domain already has email service configured (MX records pointing to another service).

---

## Solution Options

### Option 1: Check Current MX Records (Recommended First Step)

1. In Namecheap, go to **Advanced DNS** for `shiftcoach.app`
2. Look for **MX Records** section
3. Check what MX records exist:
   - If you see MX records pointing to another service (like Google Workspace, Microsoft 365, etc.), that's why forwarding is disabled
   - If MX records are empty or point to Namecheap, you can proceed

### Option 2: Use Namecheap's Private Email (If Available)

If your domain doesn't have active email hosting elsewhere:

1. Go to **Advanced DNS**
2. Look for **Private Email** or **Email Hosting** option
3. Enable it (may require purchase)
4. Then set up forwarding rules

### Option 3: Use Outlook.com Email Aliases (Alternative)

Since you're forwarding to Outlook.com anyway, you could:

1. Set up Outlook.com to receive emails for your domain (requires Microsoft 365 or custom domain setup)
2. Or use Outlook.com's alias feature if you have a Microsoft account

### Option 4: Use a Third-Party Email Forwarding Service

Services that can forward emails:
- **ForwardMX** (simple, free tier available)
- **Cloudflare Email Routing** (if you use Cloudflare for DNS)
- **Zoho Mail** (free tier with forwarding)

### Option 5: Use Catch-All Forwarding (If Available)

Some providers allow "catch-all" forwarding:
- All emails to `*@shiftcoach.app` forward to one address
- This would catch `privacy@`, `legal@`, `healthdata@` automatically

---

## Quick Fix: Check Your DNS Settings

1. Go to **Advanced DNS** in Namecheap
2. Look at **MX Records**
3. **If MX records exist and point elsewhere:**
   - You'll need to either:
     - Remove those MX records (if not using that email service)
     - Or use that email service to set up forwarding instead
4. **If no MX records or they point to Namecheap:**
   - Contact Namecheap support to enable email forwarding
   - Or try enabling "Private Email" first

---

## Alternative: Use Direct Email Addresses

If forwarding is too complicated right now, you can:

1. **Temporarily use direct email** in legal pages:
   - Change all three to `shift-coach@outlook.com`
   - Set up forwarding later when you have time

2. **Or use a single contact email:**
   - `contact@shiftcoach.app` → `shift-coach@outlook.com`
   - Use this one email for all legal pages

---

## Recommended Next Steps

1. **Check your MX records** in Advanced DNS
2. **Contact Namecheap support** via live chat - they can help enable forwarding
3. **Or use the direct email approach** for now and set up forwarding later

---

## Contact Namecheap Support

If you need help:
- **Live Chat:** Available 24/7 on Namecheap website
- **Support Ticket:** Submit through your account
- Ask them: "How do I set up email forwarding for shiftcoach.app when I see 'domain is using other email service'?"

