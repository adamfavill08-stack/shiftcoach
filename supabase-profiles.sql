-- Profiles table with RLS policies
-- Paste this in Supabase SQL Editor
-- This script drops existing policies first, then creates them

-- Create table if it doesn't exist
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add columns if they don't exist (for existing tables)
do $$
begin
  -- Add sex column
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'sex') then
    alter table public.profiles add column sex text check (sex in ('male','female','other')) default 'other';
  end if;
  
  -- Add height_cm column
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'height_cm') then
    alter table public.profiles add column height_cm int;
  end if;
  
  -- Add weight_kg column
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'weight_kg') then
    alter table public.profiles add column weight_kg numeric;
  end if;
  
  -- Add goal column
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'goal') then
    alter table public.profiles add column goal text check (goal in ('lose','maintain','gain')) default 'maintain';
  end if;
  
  -- Add units column
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'units') then
    alter table public.profiles add column units text check (units in ('metric','imperial')) default 'metric';
  end if;
  
  -- Add sleep_goal_h column
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'sleep_goal_h') then
    alter table public.profiles add column sleep_goal_h numeric default 7.5;
  end if;
  
  -- Add water_goal_ml column
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'water_goal_ml') then
    alter table public.profiles add column water_goal_ml int default 2500;
  end if;
  
  -- Add tz column
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'tz') then
    alter table public.profiles add column tz text default 'Europe/London';
  end if;
  
  -- Add step_goal column
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'step_goal') then
    alter table public.profiles add column step_goal int default 10000;
  end if;
end $$;

alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Create policies
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

