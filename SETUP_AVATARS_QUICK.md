# Quick Setup: Avatars Storage Bucket

## Step 1: Create the Bucket (in Supabase Dashboard)

1. Go to **Storage** in your Supabase Dashboard
2. Click **"New bucket"**
3. Name it: `avatars`
4. **Turn ON** "Public bucket" ✅
5. (Optional) Turn ON "Restrict file size" and set to 5MB
6. (Optional) Turn ON "Restrict MIME types" and add: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
7. Click **"Create"**

## Step 2: Run the Migration (in Supabase SQL Editor)

1. Go to **SQL Editor** in your Supabase Dashboard
2. Click **"New query"**
3. Copy and paste the contents of: `supabase/migrations/20250127_setup_avatars_storage_policies.sql`
4. Click **"Run"** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

## Step 3: Verify Policies

1. Go to **Storage** → **Policies**
2. Select the **`avatars`** bucket
3. You should see 4 policies:
   - ✅ Public avatar access
   - ✅ Users can upload their own avatars
   - ✅ Users can update their own avatars
   - ✅ Users can delete their own avatars

## Step 4: Test It!

1. Go to your app's Profile page
2. Click the **+** button on the profile picture
3. Select an image
4. It should upload successfully! 🎉

---

**That's it!** The migration file handles all the policy setup automatically.

