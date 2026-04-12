-- Logical civil date for daily step totals (device/Health calendar day), independent of sync timestamp.
-- Used with user_id for upsert identity; ts remains sync metadata.

ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS activity_date date NULL;

COMMENT ON COLUMN public.activity_logs.activity_date IS
'Civil YYYY-MM-DD for the step total (HealthKit/Health Connect local day). Upsert key with user_id. ts is sync time only.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_logs_user_activity_date_unique
ON public.activity_logs (user_id, activity_date)
WHERE activity_date IS NOT NULL;
