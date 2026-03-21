-- Table for storing each user's active shift pattern

create table if not exists public.user_shift_patterns (
  user_id uuid primary key references auth.users (id) on delete cascade,

  shift_length text not null check (shift_length in ('8h','12h','16h')),

  pattern_id text not null,

  pattern_slots jsonb not null,

  current_shift_index integer not null default 0,

  start_date date not null,

  color_config jsonb not null default '{}'::jsonb,

  notes text,

  created_at timestamptz not null default now()
);

create index if not exists idx_user_shift_patterns_user_id
  on public.user_shift_patterns (user_id);
