-- Add default_activity_level column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'default_activity_level'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN default_activity_level text 
      CHECK (default_activity_level IN ('low', 'medium', 'high')) 
      DEFAULT 'medium';
  END IF;
END $$;

-- Update daily_checkin_reminder to include new options for adjusted calories and meal times
-- Note: The column already exists, but we're documenting the new usage
-- The existing values ('off', 'morning', 'evening') will be used for timing
-- The reminder will be for "adjusted calories and meal times" as per user request

