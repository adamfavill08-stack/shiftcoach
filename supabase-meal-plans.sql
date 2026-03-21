-- Meal plans table
-- Paste this in Supabase SQL Editor after profiles is set up

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  slot text not null check (slot in ('breakfast','lunch','dinner','pre','mid','post')),
  title text not null,
  kcal int not null,
  protein_g int not null,
  carbs_g int not null,
  fats_g int not null,
  items jsonb not null default '[]'::jsonb,
  eaten boolean not null default false,
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date, slot)
);

alter table public.meal_plans enable row level security;

-- Drop existing policies if they exist
drop policy if exists "meal_plans_select_own" on public.meal_plans;
drop policy if exists "meal_plans_insert_own" on public.meal_plans;
drop policy if exists "meal_plans_update_own" on public.meal_plans;
drop policy if exists "meal_plans_delete_own" on public.meal_plans;

-- Create policies
create policy "meal_plans_select_own"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "meal_plans_insert_own"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "meal_plans_update_own"
  on public.meal_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meal_plans_delete_own"
  on public.meal_plans for delete
  using (auth.uid() = user_id);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_meal_plans_updated_at on public.meal_plans;
create trigger update_meal_plans_updated_at
  before update on public.meal_plans
  for each row
  execute function update_updated_at_column();

