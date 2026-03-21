# Avatar Upload Setup Guide

## Issue
If you're unable to upload profile pictures, the most likely cause is that the Supabase Storage bucket for avatars doesn't exist or isn't configured properly.

## Solution

### Step 1: Create the Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Create a bucket named **`avatars`**
5. Make sure it's set to **Public** (so images can be accessed via URL)

### Step 2: Set Up Storage Policies

The bucket needs policies to allow users to upload and read their own avatars.

#### Policy 1: Allow users to upload their own avatars

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow users to read avatars (public read)

```sql
-- Allow public read access to avatars
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

#### Policy 3: Allow users to update their own avatars

```sql
-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 4: Allow users to delete their own avatars

```sql
-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Apply Policies via Supabase Dashboard

1. Go to **Storage** → **Policies** in your Supabase Dashboard
2. Select the **`avatars`** bucket
3. Click **"New Policy"** for each policy above
4. Or use the SQL Editor to run all policies at once

### Alternative: Use Supabase Dashboard UI

1. Go to **Storage** → **Policies**
2. Click **"New Policy"**
3. Use the policy templates:
   - **For Upload**: "Allow authenticated users to upload files"
   - **For Read**: "Allow public read access"
   - **For Update**: "Allow authenticated users to update their own files"
   - **For Delete**: "Allow authenticated users to delete their own files"

### Step 4: Verify Setup

After creating the bucket and policies:

1. Try uploading a profile picture again
2. Check the browser console for any errors
3. Check the Supabase Storage logs if upload fails

## Troubleshooting

### Error: "Bucket not found"
- The `avatars` bucket doesn't exist → Create it (Step 1)

### Error: "Permission denied"
- Storage policies aren't set up → Apply policies (Step 2-3)

### Error: "Failed to upload image"
- Check Supabase Storage logs
- Verify the bucket is set to **Public**
- Check that file size is under 5MB
- Verify file is a valid image format

### Image uploads but doesn't display
- Check that the bucket is **Public**
- Verify the `avatar_url` is being saved to the profile
- Check browser console for CORS or image loading errors

## File Structure

Avatars are stored with the following structure:
```
avatars/
  {userId}/
    {timestamp}.{ext}
```

Example: `avatars/abc123/1704067200000.jpg`

This ensures each user's avatars are organized in their own folder.

