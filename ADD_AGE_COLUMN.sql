-- Simple SQL to add the age column to profiles table
-- Copy and paste this into Supabase SQL Editor and run it

-- Add age column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'age'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN age INTEGER CHECK (age >= 13 AND age <= 120);
    
    COMMENT ON COLUMN public.profiles.age IS 'User age in years';
    
    RAISE NOTICE 'Age column added successfully!';
  ELSE
    RAISE NOTICE 'Age column already exists!';
  END IF;
END $$;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'age';

