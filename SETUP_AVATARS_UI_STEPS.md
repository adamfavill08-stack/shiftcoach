# Setup Avatars Storage Policies (UI Method)

Since SQL doesn't work for storage policies, create them through the Supabase Dashboard UI.

## Step 1: Create the Bucket ✅
(You've already done this)
- Name: `avatars`
- Public: ON
- Create

## Step 2: Create Policies via UI

Go to **Storage** → **Policies** → Select **`avatars`** bucket

### Policy 1: Public Read Access

1. Click **"New Policy"**
2. **Policy name:** `Public avatar access`
3. **Allowed operation:** Check ✅ **SELECT** only
4. **Target roles:** Leave as default (public) or select "public"
5. **Policy definition:** 
   ```
   bucket_id = 'avatars'
   ```
6. Click **"Save policy"**

---

### Policy 2: Users Can Upload

1. Click **"New Policy"** again
2. **Policy name:** `Users can upload their own avatars`
3. **Allowed operation:** Check ✅ **INSERT** only
4. **Target roles:** Select **"authenticated"**
5. **Policy definition:**
   ```
   bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
   ```
6. Click **"Save policy"**

---

### Policy 3: Users Can Update

1. Click **"New Policy"** again
2. **Policy name:** `Users can update their own avatars`
3. **Allowed operation:** Check ✅ **UPDATE** only
4. **Target roles:** Select **"authenticated"**
5. **Policy definition:**
   ```
   bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
   ```
6. Click **"Save policy"**

---

### Policy 4: Users Can Delete

1. Click **"New Policy"** again
2. **Policy name:** `Users can delete their own avatars`
3. **Allowed operation:** Check ✅ **DELETE** only
4. **Target roles:** Select **"authenticated"**
5. **Policy definition:**
   ```
   bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
   ```
6. Click **"Save policy"**

---

## Done! ✅

After creating all 4 policies, try uploading a profile picture. It should work!

