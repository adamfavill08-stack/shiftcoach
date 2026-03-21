-- sleep_logs table (simplified schema)
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null,
  end_at   timestamptz not null,
  deep_minutes int default 0,
  rem_minutes  int default 0,
  light_minutes int default 0,
  awake_minutes int default 0,
  quality text check (quality in ('Excellent','Good','Fair','Poor')) default 'Fair',
  inserted_at timestamptz default now()
);

-- simple RLS (dev-friendly)
alter table public.sleep_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='sleep_logs' and policyname='sleep_owner_all') then
    create policy sleep_owner_all
      on public.sleep_logs
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Indexes for performance
create index if not exists idx_sleep_logs_user_end_at on public.sleep_logs(user_id, end_at desc);
create index if not exists idx_sleep_logs_user_start_at on public.sleep_logs(user_id, start_at desc);

