-- Manual activity sessions: separate rows from daily wearable totals; safe merge when sync catches up.
-- Ensures activity_date exists (same as 20260412120000_activity_logs_activity_date.sql) for DBs that never ran it.

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS activity_date date NULL,
  ADD COLUMN IF NOT EXISTS source text NULL;

COMMENT ON COLUMN public.activity_logs.activity_date IS
  'Civil YYYY-MM-DD for the step total (HealthKit/Health Connect local day). Upsert key with user_id. ts is sync time only.';

COMMENT ON COLUMN public.activity_logs.source IS
  'Row origin: health_connect, manual, Apple Health, etc. Used to separate wearable daily totals from manual sessions.';

-- Allow multiple manual rows per (user_id, activity_date); keep at most one non-manual aggregate per day.
DROP INDEX IF EXISTS public.idx_activity_logs_user_activity_date_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_logs_user_activity_date_non_manual_unique
ON public.activity_logs (user_id, activity_date)
WHERE activity_date IS NOT NULL AND source IS DISTINCT FROM 'manual';

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS activity_type text NULL,
  ADD COLUMN IF NOT EXISTS start_time timestamptz NULL,
  ADD COLUMN IF NOT EXISTS end_time timestamptz NULL,
  ADD COLUMN IF NOT EXISTS reason text NULL,
  ADD COLUMN IF NOT EXISTS merge_status text NULL,
  ADD COLUMN IF NOT EXISTS superseded_by_source text NULL,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS distance_m integer NULL,
  ADD COLUMN IF NOT EXISTS calories integer NULL;

COMMENT ON COLUMN public.activity_logs.merge_status IS
  'For source=manual: active | superseded_by_wearable | partially_overlapped | user_confirmed_keep. Wearable rows leave NULL.';

COMMENT ON COLUMN public.activity_logs.reason IS
  'For manual rows: wearable_sync_missing | forgot_watch | other.';

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date_manual_active
ON public.activity_logs (user_id, activity_date)
WHERE source = 'manual' AND (merge_status IS NULL OR merge_status = 'active');
