-- Nutrition logs table for meal logging
-- Paste this in Supabase SQL Editor

create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  brand text,
  calories integer not null,
  protein numeric,
  carbs numeric,
  fat numeric,
  portion_multiplier numeric default 1,
  logged_at timestamptz not null default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.nutrition_logs enable row level security;

-- Drop existing policies if they exist
drop policy if exists "nutrition_logs_select_own" on public.nutrition_logs;
drop policy if exists "nutrition_logs_insert_own" on public.nutrition_logs;
drop policy if exists "nutrition_logs_update_own" on public.nutrition_logs;
drop policy if exists "nutrition_logs_delete_own" on public.nutrition_logs;

-- Create policies
create policy "nutrition_logs_select_own"
  on public.nutrition_logs for select
  using (auth.uid() = user_id);

create policy "nutrition_logs_insert_own"
  on public.nutrition_logs for insert
  with check (auth.uid() = user_id);

create policy "nutrition_logs_update_own"
  on public.nutrition_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "nutrition_logs_delete_own"
  on public.nutrition_logs for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists idx_nutrition_logs_user_logged_at 
  on public.nutrition_logs(user_id, logged_at desc);

create index if not exists idx_nutrition_logs_meal_type 
  on public.nutrition_logs(user_id, meal_type, logged_at desc);

