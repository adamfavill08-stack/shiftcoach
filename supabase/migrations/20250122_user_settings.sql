-- Add missing user settings columns to profiles table
-- Run this in Supabase SQL Editor

-- Add age column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'age'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN age int CHECK (age >= 16 AND age <= 100);
  END IF;
END $$;

-- Add shift_pattern column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'shift_pattern'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN shift_pattern text 
      CHECK (shift_pattern IN ('rotating', 'mostly_days', 'mostly_nights', 'custom')) 
      DEFAULT 'rotating';
  END IF;
END $$;

-- Add ideal_sleep_start column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'ideal_sleep_start'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN ideal_sleep_start time;
  END IF;
END $$;

-- Add ideal_sleep_end column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'ideal_sleep_end'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN ideal_sleep_end time;
  END IF;
END $$;

-- Add wake_reminder_enabled column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'wake_reminder_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN wake_reminder_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add wake_reminder_trigger column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'wake_reminder_trigger'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN wake_reminder_trigger text 
      CHECK (wake_reminder_trigger IN ('off', 'after_night_shift', 'every_day')) 
      DEFAULT 'off';
  END IF;
END $$;

-- Add mood_focus_alerts_enabled column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'mood_focus_alerts_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN mood_focus_alerts_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Add daily_checkin_reminder column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'daily_checkin_reminder'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN daily_checkin_reminder text 
      CHECK (daily_checkin_reminder IN ('off', 'morning', 'evening')) 
      DEFAULT 'off';
  END IF;
END $$;

-- Add ai_coach_tone column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'ai_coach_tone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN ai_coach_tone text 
      CHECK (ai_coach_tone IN ('calm', 'direct')) 
      DEFAULT 'calm';
  END IF;
END $$;

-- Add calorie_adjustment_aggressiveness column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'calorie_adjustment_aggressiveness'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN calorie_adjustment_aggressiveness text 
      CHECK (calorie_adjustment_aggressiveness IN ('gentle', 'balanced', 'aggressive')) 
      DEFAULT 'balanced';
  END IF;
END $$;

-- Add macro_split_preset column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'macro_split_preset'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN macro_split_preset text 
      CHECK (macro_split_preset IN ('balanced', 'high_protein', 'custom')) 
      DEFAULT 'balanced';
  END IF;
END $$;

-- Add default_logging_method column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'default_logging_method'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN default_logging_method text 
      CHECK (default_logging_method IN ('manual', 'photo', 'barcode')) 
      DEFAULT 'manual';
  END IF;
END $$;

-- Add animations_enabled column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'animations_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN animations_enabled boolean DEFAULT true;
  END IF;
END $$;

