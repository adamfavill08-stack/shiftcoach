-- Create daily_metrics table for pre-computed daily nutrition and activity metrics
-- This table stores pre-computed values from the midnight cron job
-- to improve performance and ensure metrics are ready when users open the app

create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  
  -- Calorie calculations
  adjusted_kcal integer not null,
  base_kcal integer not null,
  
  -- Factors used in calculation
  rhythm_score numeric(5,2), -- 0-100
  rhythm_factor numeric(4,3) not null default 1.0,
  sleep_factor numeric(4,3) not null default 1.0,
  shift_factor numeric(4,3) not null default 1.0,
  activity_factor numeric(4,3) not null default 1.0,
  shift_activity_factor numeric(4,3) not null default 1.0,
  
  -- Context data
  sleep_hours_last24h numeric(4,1),
  shift_type text check (shift_type in ('day', 'night', 'off', 'other')),
  activity_level text,
  
  -- Macro targets
  protein_g numeric(6,1) not null,
  carbs_g numeric(6,1) not null,
  fat_g numeric(6,1) not null,
  sat_fat_g numeric(6,1) not null default 0,
  
  -- Metadata
  computed_at timestamptz default now(),
  
  -- Unique constraint: one record per user per day
  unique(user_id, date)
);

-- Enable RLS
alter table public.daily_metrics enable row level security;

-- Policies for daily_metrics
create policy "daily_metrics_select_own"
  on public.daily_metrics for select
  using (auth.uid() = user_id);

-- Service role can insert/update (for cron job)
-- This is handled via service role key in API, so no RLS policy needed for insert/update

-- Create index for faster queries
create index if not exists idx_daily_metrics_user_date
  on public.daily_metrics(user_id, date desc);

-- Create index for cron job queries (finding today's records)
create index if not exists idx_daily_metrics_date
  on public.daily_metrics(date desc);

