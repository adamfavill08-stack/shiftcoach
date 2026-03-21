-- Weekly goal feedback table for tracking user goal completion sentiment
-- Run this in Supabase SQL Editor

set search_path = public;

create table if not exists public.weekly_goal_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  sentiment text check (sentiment in ('completed', 'partial', 'struggled')) not null,
  reflection text, -- free-text from user or LLM summary
  created_at timestamptz default now()
);

-- Index for performance
create index if not exists idx_weekly_goal_feedback_user_week
on public.weekly_goal_feedback (user_id, week_start);

-- Enable Row Level Security
alter table public.weekly_goal_feedback enable row level security;

-- Policies: users can view and insert their own feedback
create policy "Users can view their own weekly_goal_feedback" on public.weekly_goal_feedback
  for select using (auth.uid() = user_id);

create policy "Users can insert their own weekly_goal_feedback" on public.weekly_goal_feedback
  for insert with check (auth.uid() = user_id);

