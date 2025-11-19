-- Enhanced meal_logs table with source, food_name, and macros
-- Paste this in Supabase SQL Editor

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add meal_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND column_name = 'meal_type'
  ) THEN
    ALTER TABLE public.meal_logs ADD COLUMN meal_type text;
  END IF;

  -- Add source if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.meal_logs ADD COLUMN source text;
  END IF;

  -- Add food_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND column_name = 'food_name'
  ) THEN
    ALTER TABLE public.meal_logs ADD COLUMN food_name text;
  END IF;

  -- Add protein if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND column_name = 'protein'
  ) THEN
    ALTER TABLE public.meal_logs ADD COLUMN protein numeric;
  END IF;

  -- Add carbs if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND column_name = 'carbs'
  ) THEN
    ALTER TABLE public.meal_logs ADD COLUMN carbs numeric;
  END IF;

  -- Add fat if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND column_name = 'fat'
  ) THEN
    ALTER TABLE public.meal_logs ADD COLUMN fat numeric;
  END IF;

  -- Add portion_size if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND column_name = 'portion_size'
  ) THEN
    ALTER TABLE public.meal_logs ADD COLUMN portion_size text;
  END IF;

  -- Add barcode if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND column_name = 'barcode'
  ) THEN
    ALTER TABLE public.meal_logs ADD COLUMN barcode text;
  END IF;

  -- Add logged_at if it doesn't exist (for consistency)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND column_name = 'logged_at'
  ) THEN
    ALTER TABLE public.meal_logs ADD COLUMN logged_at timestamptz;
    -- Set logged_at to created_at for existing rows
    UPDATE public.meal_logs SET logged_at = created_at WHERE logged_at IS NULL;
  END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
  -- Add meal_type constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND constraint_name = 'meal_logs_meal_type_check'
  ) THEN
    ALTER TABLE public.meal_logs 
    ADD CONSTRAINT meal_logs_meal_type_check 
    CHECK (meal_type IS NULL OR meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'));
  END IF;

  -- Add source constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_schema = 'public' 
    AND table_name = 'meal_logs' 
    AND constraint_name = 'meal_logs_source_check'
  ) THEN
    ALTER TABLE public.meal_logs 
    ADD CONSTRAINT meal_logs_source_check 
    CHECK (source IS NULL OR source IN ('manual', 'barcode', 'photo'));
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS meal_logs_user_logged_at_idx
  ON public.meal_logs(user_id, logged_at DESC);

