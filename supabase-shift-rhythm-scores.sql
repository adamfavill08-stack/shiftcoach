-- Shift Rhythm Scores table for daily rhythm calculation
-- Run this in Supabase SQL Editor

set search_path = public;

create table if not exists public.shift_rhythm_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_score numeric,
  regularity_score numeric,
  shift_pattern_score numeric,
  recovery_score numeric,
  total_score numeric,
  created_at timestamptz default now()
);

-- Unique constraint: one score per user per day
create unique index if not exists idx_shift_rhythm_user_date
on public.shift_rhythm_scores (user_id, date);

-- Enable Row Level Security
alter table public.shift_rhythm_scores enable row level security;

-- Policies: users can view and insert their own scores
create policy "Users can view their own shift_rhythm_scores" on public.shift_rhythm_scores
  for select using (auth.uid() = user_id);

create policy "Users can insert their own shift_rhythm_scores" on public.shift_rhythm_scores
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own shift_rhythm_scores" on public.shift_rhythm_scores
  for update using (auth.uid() = user_id);

