-- Weekly summaries table for AI Coach weekly check-ins
-- Run this in Supabase SQL Editor

set search_path = public;

create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null, -- e.g. Monday of that ISO week
  summary_text text not null, -- AI generated
  created_at timestamptz default now(),
  -- optional metadata for trends
  sleep_hours_avg numeric,
  body_clock_avg numeric,
  recovery_avg numeric,
  steps_avg numeric,
  calories_avg numeric
);

-- Unique constraint: one summary per user per week
create unique index if not exists weekly_summaries_user_week
on public.weekly_summaries (user_id, week_start);

-- Enable Row Level Security
alter table public.weekly_summaries enable row level security;

-- Policies: users can view their own summaries
create policy "Users can view their own weekly_summaries" on public.weekly_summaries
  for select using (auth.uid() = user_id);

create policy "Users can insert their own weekly_summaries" on public.weekly_summaries
  for insert with check (auth.uid() = user_id);

-- Service role can insert/update for cron job (this will be done via service role key in API)
-- The cron job will use service role, so no RLS policy needed for that

