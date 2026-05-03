-- Manual and wearable rows store active minutes when available (inserts/selects expect this column).
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS active_minutes integer NULL;

COMMENT ON COLUMN public.activity_logs.active_minutes IS
  'Active minutes for this log row when provided by the source or manual entry.';
