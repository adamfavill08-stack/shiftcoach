-- Setup Storage Policies for Avatars Bucket
-- This migration creates all necessary policies for the avatars storage bucket
-- Run this in Supabase SQL Editor after creating the 'avatars' bucket

-- First, ensure the bucket exists (this won't create it, but will help with errors)
-- You must create the 'avatars' bucket in Storage first via the Supabase Dashboard

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Policy 1: Public read access (anyone can view avatars)
-- This allows profile pictures to be displayed publicly
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy 2: Users can upload their own avatars
-- Users can only upload to their own folder (named with their user ID)
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can update their own avatars
-- Users can only update files in their own folder
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete their own avatars
-- Users can only delete files in their own folder
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add comments for documentation
COMMENT ON POLICY "Public avatar access" ON storage.objects IS 
'Allows public read access to avatar images in the avatars bucket';

COMMENT ON POLICY "Users can upload their own avatars" ON storage.objects IS 
'Allows authenticated users to upload avatars to their own folder (userId/timestamp.ext)';

COMMENT ON POLICY "Users can update their own avatars" ON storage.objects IS 
'Allows authenticated users to update their own avatar files';

COMMENT ON POLICY "Users can delete their own avatars" ON storage.objects IS 
'Allows authenticated users to delete their own avatar files';

