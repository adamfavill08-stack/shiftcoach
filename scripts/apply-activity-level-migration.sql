-- Migration to add shift_activity_level column to activity_logs table
-- Run this in Supabase SQL Editor

-- Add column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'shift_activity_level'
  ) THEN
    ALTER TABLE public.activity_logs 
    ADD COLUMN shift_activity_level TEXT 
    CHECK (shift_activity_level IN ('very_light', 'light', 'moderate', 'busy', 'intense'));
    
    RAISE NOTICE 'Column shift_activity_level added successfully';
  ELSE
    RAISE NOTICE 'Column shift_activity_level already exists';
  END IF;
END $$;

-- Create index for quick lookups by user
-- Note: Using user_id and shift_activity_level only (date column may not exist)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_level 
ON public.activity_logs(user_id, shift_activity_level) 
WHERE shift_activity_level IS NOT NULL;

-- Verify the column was created
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'activity_logs' 
AND column_name = 'shift_activity_level';

