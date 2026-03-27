-- Canonical sleep_logs model with soft-delete and source/type normalization.
-- This migration is additive and backfills old rows where possible.

alter table if exists public.sleep_logs
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists type text,
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists timezone text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

-- Drop legacy constraints first so canonical backfills do not fail mid-migration.
alter table public.sleep_logs drop constraint if exists sleep_type_chk;
alter table public.sleep_logs drop constraint if exists sleep_source_chk;
alter table public.sleep_logs drop constraint if exists sleep_quality_chk;
alter table public.sleep_logs drop constraint if exists sleep_logs_type_check;
alter table public.sleep_logs drop constraint if exists sleep_logs_source_check;
alter table public.sleep_logs drop constraint if exists sleep_logs_quality_check;

-- Backfill canonical timestamps from legacy columns
update public.sleep_logs
set start_at = coalesce(start_at, start_ts)
where start_at is null;

update public.sleep_logs
set end_at = coalesce(end_at, end_ts)
where end_at is null;

-- Backfill canonical type from legacy naps column
update public.sleep_logs
set type = case
  when type is not null then type
  when coalesce(naps, 0) = 0 then 'main_sleep'
  else 'nap'
end
where type is null;

-- Normalize legacy values if present
update public.sleep_logs set type = 'main_sleep' where type = 'sleep';
update public.sleep_logs set type = 'post_shift_sleep' where type = 'post_shift';
update public.sleep_logs set type = 'recovery_sleep' where type = 'recovery';
update public.sleep_logs set type = 'nap' where type = 'pre_shift_nap';

-- Backfill source and enforce non-null
update public.sleep_logs
set source = coalesce(source, 'manual')
where source is null;

-- Normalize legacy quality values before enforcing canonical range.
-- Some historic rows contain 0 or out-of-range values; treat them as unknown.
update public.sleep_logs
set quality = null
where quality is not null
  and (quality < 1 or quality > 5);

-- Legacy columns may still exist with NOT NULL constraints from old schema.
-- Drop those so canonical writes (start_at/end_at) are not blocked.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sleep_logs' and column_name = 'start_ts'
  ) then
    execute 'alter table public.sleep_logs alter column start_ts drop not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sleep_logs' and column_name = 'end_ts'
  ) then
    execute 'alter table public.sleep_logs alter column end_ts drop not null';
  end if;
end $$;

alter table public.sleep_logs
  alter column start_at set not null,
  alter column end_at set not null,
  alter column type set not null,
  alter column source set not null;

-- Add/replace constraints for canonical enums and ranges
alter table public.sleep_logs drop constraint if exists sleep_logs_type_check;
alter table public.sleep_logs
  add constraint sleep_logs_type_check
  check (type in ('main_sleep', 'post_shift_sleep', 'recovery_sleep', 'nap'));

alter table public.sleep_logs drop constraint if exists sleep_logs_source_check;
alter table public.sleep_logs
  add constraint sleep_logs_source_check
  check (source in ('manual', 'apple_health', 'health_connect', 'fitbit', 'oura', 'garmin'));

alter table public.sleep_logs drop constraint if exists sleep_logs_quality_check;
alter table public.sleep_logs
  add constraint sleep_logs_quality_check
  check (quality between 1 and 5);

create index if not exists sleep_logs_user_start_idx
  on public.sleep_logs(user_id, start_at desc);

create index if not exists sleep_logs_user_end_idx
  on public.sleep_logs(user_id, end_at desc);

create unique index if not exists sleep_logs_user_source_external_idx
  on public.sleep_logs(user_id, source, external_id)
  where external_id is not null;

alter table public.sleep_logs enable row level security;

drop policy if exists "Users can read own sleep logs" on public.sleep_logs;
create policy "Users can read own sleep logs"
on public.sleep_logs
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own sleep logs" on public.sleep_logs;
create policy "Users can insert own sleep logs"
on public.sleep_logs
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own sleep logs" on public.sleep_logs;
create policy "Users can update own sleep logs"
on public.sleep_logs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sleep logs" on public.sleep_logs;
create policy "Users can delete own sleep logs"
on public.sleep_logs
for delete
using (auth.uid() = user_id);
