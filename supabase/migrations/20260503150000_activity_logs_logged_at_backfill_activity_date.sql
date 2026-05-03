-- Backfill civil activity day from logged_at.
-- Does not reference `ts`: some production `activity_logs` tables never had that column.
-- If your table has `ts` and you want logged_at filled from it first, run once by hand, e.g.:
--   UPDATE public.activity_logs SET logged_at = ts WHERE logged_at IS NULL AND ts IS NOT NULL;

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS logged_at timestamptz NULL;

COMMENT ON COLUMN public.activity_logs.logged_at IS
  'When the activity occurred (device local day anchor). Distinct from created_at (row insert/import).';

UPDATE public.activity_logs
SET logged_at = created_at
WHERE logged_at IS NULL
  AND created_at IS NOT NULL;

-- idx_activity_logs_user_activity_date_non_manual_unique: at most one non-manual row per (user_id, activity_date).
-- Skip rows that would collide with an existing dated row; among duplicates (same user + logged_at::date), only
-- update the first row by id so the same statement does not create two identical keys.
UPDATE public.activity_logs al
SET activity_date = (al.logged_at)::date
FROM (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, (logged_at)::date
           ORDER BY id
         ) AS rn
  FROM public.activity_logs
  WHERE activity_date IS NULL
    AND logged_at IS NOT NULL
    AND source IS DISTINCT FROM 'manual'
) pick
WHERE al.id = pick.id
  AND pick.rn = 1
  AND NOT EXISTS (
    SELECT 1
    FROM public.activity_logs o
    WHERE o.user_id = al.user_id
      AND o.id IS DISTINCT FROM al.id
      AND o.activity_date IS NOT NULL
      AND o.activity_date = (al.logged_at)::date
      AND o.source IS DISTINCT FROM 'manual'
  );

-- Manual rows (source = 'manual' exactly) are excluded from that partial unique index; safe to set in one pass.
UPDATE public.activity_logs
SET activity_date = (logged_at)::date
WHERE activity_date IS NULL
  AND logged_at IS NOT NULL
  AND source IS NOT DISTINCT FROM 'manual';
