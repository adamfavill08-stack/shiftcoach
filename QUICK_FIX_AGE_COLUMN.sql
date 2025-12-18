-- QUICK FIX: Add age column to profiles table
-- This is the MINIMUM needed to fix the age saving issue
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Copy this ENTIRE file
-- 4. Paste into SQL Editor
-- 5. Click "Run" (or press Ctrl+Enter)
-- 6. You should see "Success" message
-- 7. Try onboarding again - age should now save!

-- Add age column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 13 AND age <= 120);

-- Verify it worked (this will show the column if it exists)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'age';

