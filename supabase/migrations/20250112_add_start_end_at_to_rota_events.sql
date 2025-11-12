-- Add start_at and end_at timestamptz fields to rota_events
-- These are more flexible than date + start_time/end_time

alter table public.rota_events
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz;

-- Migrate existing data: convert date + start_time/end_time to start_at/end_at
-- For all_day events, set start_at to date at 00:00 and end_at to date at 23:59
update public.rota_events
set
  start_at = case
    when all_day then (date::text || ' 00:00:00+00')::timestamptz
    when start_time is not null then (date::text || ' ' || start_time::text || '+00')::timestamptz
    else (date::text || ' 00:00:00+00')::timestamptz
  end,
  end_at = case
    when all_day then (date::text || ' 23:59:59+00')::timestamptz
    when end_time is not null then (date::text || ' ' || end_time::text || '+00')::timestamptz
    else (date::text || ' 23:59:59+00')::timestamptz
  end
where start_at is null or end_at is null;

-- Make start_at required (not null) going forward
alter table public.rota_events
  alter column start_at set not null,
  alter column end_at set not null;

-- Add index for efficient queries by start_at
create index if not exists idx_rota_events_user_start_at
  on public.rota_events (user_id, start_at);

