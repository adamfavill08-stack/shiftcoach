-- Dashboard performance indexes to speed up personalized dashboard API routes
-- without changing any user-facing behavior.

-- SHIFTS
-- Queries frequently filter by user_id and date and order by date
-- (e.g. /api/shifts, /api/shiftlag, /api/activity/today, /api/circadian/calculate).
create index if not exists idx_shifts_user_date
  on public.shifts(user_id, date);

-- ACTIVITY LOGS
-- NOTE: The current activity_logs schema does not have stable timestamp
-- columns like ts/created_at that exist in all environments, so we skip
-- adding an index here to avoid migration errors. If you later standardize
-- on a timestamp column, you can safely add a (user_id, <timestamp>) index.

-- SHIFT RHYTHM SCORES
-- /api/shift-rhythm and /api/activity/today look up scores by user_id + date
-- and often sort by date.
create index if not exists idx_shift_rhythm_scores_user_date
  on public.shift_rhythm_scores(user_id, date desc);

-- CIRCADIAN LOGS
-- /api/shiftlag and /api/circadian/calculate read the latest row per user
-- ordered by created_at.
create index if not exists idx_circadian_logs_user_created_at
  on public.circadian_logs(user_id, created_at desc);

-- SHIFTLAG LOGS
-- /api/shiftlag upserts a row per user per day; this keeps writes fast and
-- supports any future per-day lookups. Guarded by a table-existence check so
-- this migration is safe in environments that don't yet have shiftlag_logs.
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'shiftlag_logs'
      and n.nspname = 'public'
  ) then
    create index if not exists idx_shiftlag_logs_user_date
      on public.shiftlag_logs(user_id, date desc);
  end if;
end;
$$;

