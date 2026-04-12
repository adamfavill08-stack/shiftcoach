-- Persisted output from computeAdaptedStepGoalAgent (deterministic adaptation).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'adapted_daily_steps_goal'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN adapted_daily_steps_goal integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'adapted_daily_steps_goal_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN adapted_daily_steps_goal_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'activity_adaptation_agent_meta'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN activity_adaptation_agent_meta jsonb;
  END IF;
END $$;
