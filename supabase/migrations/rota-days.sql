create table if not exists public.rota_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  shift_type text not null,
  created_at timestamptz default now()
);

create unique index if not exists rota_days_user_date_idx
  on public.rota_days (user_id, date);
