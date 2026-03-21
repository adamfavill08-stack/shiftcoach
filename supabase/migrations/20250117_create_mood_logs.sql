-- Mood and Focus logs table
-- This table stores user mood and focus ratings over time

create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood integer not null check (mood between 1 and 5),
  focus integer not null check (focus between 1 and 5),
  ts timestamptz not null default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.mood_logs enable row level security;

-- Drop existing policies if they exist
drop policy if exists "mood_logs_select_own" on public.mood_logs;
drop policy if exists "mood_logs_insert_own" on public.mood_logs;
drop policy if exists "mood_logs_update_own" on public.mood_logs;
drop policy if exists "mood_logs_delete_own" on public.mood_logs;

-- Create policies
create policy "mood_logs_select_own"
  on public.mood_logs for select
  using (auth.uid() = user_id);

create policy "mood_logs_insert_own"
  on public.mood_logs for insert
  with check (auth.uid() = user_id);

create policy "mood_logs_update_own"
  on public.mood_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mood_logs_delete_own"
  on public.mood_logs for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists idx_mood_logs_user_ts 
  on public.mood_logs(user_id, ts desc);

