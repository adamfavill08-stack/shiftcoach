-- Nutrition logs table
-- Paste this in Supabase SQL Editor

create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz not null default now(),
  slot text not null check (slot in ('breakfast','lunch','dinner','pre','mid','post','snack')),
  title text not null,
  kcal int not null,
  protein_g int not null,
  carbs_g int not null,
  fats_g int not null,
  created_at timestamptz default now()
);

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

-- Index for faster queries
create index if not exists idx_nutrition_logs_user_ts on public.nutrition_logs(user_id, ts desc);

