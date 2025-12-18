-- Create shiftlag_logs table for tracking daily ShiftLag calculations
create table if not exists public.shiftlag_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  score int not null check (score between 0 and 100),
  level text not null check (level in ('low', 'moderate', 'high')),
  sleep_debt_score int not null check (sleep_debt_score between 0 and 40),
  misalignment_score int not null check (misalignment_score between 0 and 40),
  instability_score int not null check (instability_score between 0 and 20),
  sleep_debt_hours_7d numeric(5,1) not null,
  avg_night_overlap_hours numeric(4,1) not null,
  shift_start_variability_hours numeric(4,1) not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Enable RLS
alter table public.shiftlag_logs enable row level security;

-- Policies for shiftlag_logs
create policy "shiftlag_logs_select_own"
  on public.shiftlag_logs for select
  using (auth.uid() = user_id);

create policy "shiftlag_logs_insert_own"
  on public.shiftlag_logs for insert
  with check (auth.uid() = user_id);

create policy "shiftlag_logs_update_own"
  on public.shiftlag_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "shiftlag_logs_delete_own"
  on public.shiftlag_logs for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists idx_shiftlag_logs_user_date
  on public.shiftlag_logs(user_id, date desc);

