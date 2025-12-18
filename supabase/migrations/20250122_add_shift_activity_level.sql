-- Add shift_activity_level column to activity_logs table
-- This allows shift workers to self-report how physically demanding their shift was

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
  END IF;
END $$;

-- Create index for quick lookups by user and timestamp
-- Note: Using ts or created_at instead of date column (which may not exist)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_level 
ON public.activity_logs(user_id, shift_activity_level) 
WHERE shift_activity_level IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.activity_logs.shift_activity_level IS 
'Shift-specific activity level: very_light (sitting/admin), light (some walking), moderate (on feet most of shift), busy (lots of movement/lifting), intense (emergency pace/constant movement)';

