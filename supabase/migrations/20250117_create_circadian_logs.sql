-- Create circadian_logs table for tracking daily circadian calculations
create table if not exists public.circadian_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_midpoint_minutes int not null,
  deviation_hours numeric(4,1) not null,
  circadian_phase numeric(5,2) not null check (circadian_phase between 0 and 100),
  alignment_score numeric(5,2) not null check (alignment_score between 0 and 100),
  latest_shift numeric(4,1) not null,
  sleep_duration numeric(4,1) not null,
  sleep_timing numeric(4,1) not null,
  sleep_debt numeric(4,1) not null,
  inconsistency numeric(4,1) not null,
  created_at timestamptz default now()
);

-- Add created_at column if it doesn't exist (for existing tables)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'circadian_logs' 
    and column_name = 'created_at'
  ) then
    alter table public.circadian_logs add column created_at timestamptz default now();
  end if;
end $$;

-- Enable RLS
alter table public.circadian_logs enable row level security;

-- Policies for circadian_logs
create policy "circadian_logs_select_own"
  on public.circadian_logs for select
  using (auth.uid() = user_id);

create policy "circadian_logs_insert_own"
  on public.circadian_logs for insert
  with check (auth.uid() = user_id);

create policy "circadian_logs_update_own"
  on public.circadian_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "circadian_logs_delete_own"
  on public.circadian_logs for delete
  using (auth.uid() = user_id);

-- Create index for faster queries (only if created_at exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'circadian_logs' 
    and column_name = 'created_at'
  ) then
    create index if not exists idx_circadian_logs_user_created
      on public.circadian_logs(user_id, created_at desc);
  end if;
end $$;

