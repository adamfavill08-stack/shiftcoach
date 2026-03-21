-- Add RevenueCat columns to profiles table
-- This migration adds support for native in-app purchases via RevenueCat

-- Add RevenueCat user ID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'revenuecat_user_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN revenuecat_user_id TEXT;
  END IF;
END $$;

-- Add index for RevenueCat user ID lookups
CREATE INDEX IF NOT EXISTS profiles_revenuecat_user_id_idx 
  ON public.profiles(revenuecat_user_id) 
  WHERE revenuecat_user_id IS NOT NULL;

-- Add RevenueCat subscription ID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'revenuecat_subscription_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN revenuecat_subscription_id TEXT;
  END IF;
END $$;

-- Add RevenueCat entitlements (JSONB for flexible data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'revenuecat_entitlements'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN revenuecat_entitlements JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add platform tracking (stripe, revenuecat_ios, revenuecat_android)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'subscription_platform'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_platform TEXT 
      CHECK (subscription_platform IN ('stripe', 'revenuecat_ios', 'revenuecat_android'));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.revenuecat_user_id IS 'RevenueCat app user ID (format: shiftcoach_{user_id})';
COMMENT ON COLUMN public.profiles.revenuecat_subscription_id IS 'RevenueCat subscription identifier';
COMMENT ON COLUMN public.profiles.revenuecat_entitlements IS 'RevenueCat entitlements data (JSON)';
COMMENT ON COLUMN public.profiles.subscription_platform IS 'Platform source: stripe (web), revenuecat_ios, or revenuecat_android';
