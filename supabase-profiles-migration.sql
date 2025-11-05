-- Migration script to add missing columns to existing profiles table
-- Run this if you get "column does not exist" errors

-- Add goal column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'goal') then
    alter table public.profiles add column goal text check (goal in ('lose','maintain','gain')) default 'maintain';
  end if;
end $$;

-- Add units column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'units') then
    alter table public.profiles add column units text check (units in ('metric','imperial')) default 'metric';
  end if;
end $$;

-- Add sleep_goal_h column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'sleep_goal_h') then
    alter table public.profiles add column sleep_goal_h numeric default 7.5;
  end if;
end $$;

-- Add water_goal_ml column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'water_goal_ml') then
    alter table public.profiles add column water_goal_ml int default 2500;
  end if;
end $$;

-- Add tz column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'tz') then
    alter table public.profiles add column tz text default 'Europe/London';
  end if;
end $$;

-- Add sex column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'sex') then
    alter table public.profiles add column sex text check (sex in ('male','female','other')) default 'other';
  end if;
end $$;

-- Add height_cm column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'height_cm') then
    alter table public.profiles add column height_cm int;
  end if;
end $$;

-- Add weight_kg column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'weight_kg') then
    alter table public.profiles add column weight_kg numeric;
  end if;
end $$;

-- Add theme column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'theme') then
    alter table public.profiles add column theme text check (theme in ('light','dark','system')) default 'system';
  end if;
end $$;

-- Add step_goal column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'profiles' 
                 and column_name = 'step_goal') then
    alter table public.profiles add column step_goal int default 10000;
  end if;
end $$;

