-- shift_color_preferences: per-user palette for rota patterns

create table if not exists public.shift_color_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  pattern_id text not null,
  day_color text not null default '#38bdf8',   -- blue
  night_color text not null default '#6366f1', -- indigo
  off_color text not null default '#fbbf24',   -- amber
  other_color text not null default '#a855f7', -- violet
  updated_at timestamptz not null default now(),
  primary key (user_id, pattern_id)
);

alter table public.shift_color_preferences enable row level security;

create policy "Users can manage their own color preferences"
  on public.shift_color_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
