-- Sleep logs table
-- Paste this in Supabase SQL Editor to create the sleep_logs table

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, -- YYYY-MM-DD
  start_ts timestamptz not null, -- Sleep start timestamp
  end_ts timestamptz not null, -- Sleep end timestamp
  duration_min int generated always as (
    extract(epoch from (end_ts - start_ts)) / 60
  ) stored, -- Calculated duration in minutes
  sleep_hours numeric(4, 2) generated always as (
    extract(epoch from (end_ts - start_ts)) / 3600
  ) stored, -- Calculated duration in hours
  quality int check (quality >= 1 and quality <= 5), -- Sleep quality 1-5
  naps int not null default 0, -- Number of naps (0 = main sleep, 1+ = number of naps)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.sleep_logs enable row level security;

-- Drop existing policies if they exist
drop policy if exists "sleep_logs_select_own" on public.sleep_logs;
drop policy if exists "sleep_logs_insert_own" on public.sleep_logs;
drop policy if exists "sleep_logs_update_own" on public.sleep_logs;
drop policy if exists "sleep_logs_delete_own" on public.sleep_logs;

-- Create policies
create policy "sleep_logs_select_own"
  on public.sleep_logs for select
  using (auth.uid() = user_id);

create policy "sleep_logs_insert_own"
  on public.sleep_logs for insert
  with check (auth.uid() = user_id);

create policy "sleep_logs_update_own"
  on public.sleep_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sleep_logs_delete_own"
  on public.sleep_logs for delete
  using (auth.uid() = user_id);

-- Indexes for faster queries
create index if not exists idx_sleep_logs_user_date on public.sleep_logs(user_id, date desc);
create index if not exists idx_sleep_logs_user_start_ts on public.sleep_logs(user_id, start_ts desc);
create index if not exists idx_sleep_logs_user_end_ts on public.sleep_logs(user_id, end_ts desc);

-- Function to update updated_at timestamp
create or replace function update_sleep_logs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
drop trigger if exists update_sleep_logs_updated_at on public.sleep_logs;
create trigger update_sleep_logs_updated_at
  before update on public.sleep_logs
  for each row
  execute function update_sleep_logs_updated_at();

