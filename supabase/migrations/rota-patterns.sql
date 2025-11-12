create table if not exists public.rota_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern_id text not null,
  start_date date not null,
  start_slot_index integer default 0,
  color_config jsonb,
  is_active boolean default true,
  updated_at timestamptz default now()
);

create unique index if not exists rota_patterns_user_active_idx
  on public.rota_patterns (user_id)
  where is_active;
