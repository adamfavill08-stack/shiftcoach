-- Add avatar_url column to profiles table
-- This stores the URL to the user's profile picture in Supabase Storage

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.avatar_url IS 
'URL to the user profile picture stored in Supabase Storage (avatars bucket)';

