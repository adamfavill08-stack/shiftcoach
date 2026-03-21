-- Weekly goals table for AI-generated weekly focus points
-- Run this in Supabase SQL Editor

set search_path = public;

create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  goals text not null,      -- full AI-generated text (bullets or paragraphs)
  created_at timestamptz default now(),
  -- optional structured fields
  focus_area_sleep boolean default false,
  focus_area_steps boolean default false,
  focus_area_nutrition boolean default false,
  focus_area_mood boolean default false,
  focus_area_recovery boolean default false
);

-- Unique constraint: one goal set per user per week
create unique index if not exists weekly_goals_user_week
on public.weekly_goals (user_id, week_start);

-- Enable Row Level Security
alter table public.weekly_goals enable row level security;

-- Policies: users can view their own goals
create policy "Users can view their own weekly_goals" on public.weekly_goals
  for select using (auth.uid() = user_id);

create policy "Users can insert their own weekly_goals" on public.weekly_goals
  for insert with check (auth.uid() = user_id);

-- Service role can insert/update for cron job (this will be done via service role key in API)

