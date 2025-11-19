-- Sleep logs table (updated schema)
-- 1) Sleep logs (one row per sleep episode: main sleep or nap)

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,                      -- the morning date the sleep ended (anchor to wake date)
  start_at timestamptz not null,          -- bedtime
  end_at   timestamptz not null,          -- wake time
  minutes int generated always as (greatest(0, extract(epoch from (end_at - start_at)) / 60)) stored,
  kind text not null default 'main' check (kind in ('main','nap')),
  quality int check (quality between 1 and 5),  -- optional user rating
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) User sleep targets (one row per user)
create table if not exists public.sleep_targets (
  user_id uuid primary key,
  target_minutes int not null default 480,    -- default 8h
  last_updated timestamptz not null default now()
);

-- RLS
alter table public.sleep_logs enable row level security;
alter table public.sleep_targets enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where polname='sleep_logs_select') then
    create policy sleep_logs_select on public.sleep_logs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where polname='sleep_logs_ins') then
    create policy sleep_logs_ins on public.sleep_logs for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where polname='sleep_logs_upd') then
    create policy sleep_logs_upd on public.sleep_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where polname='sleep_logs_del') then
    create policy sleep_logs_del on public.sleep_logs for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where polname='sleep_targets_select') then
    create policy sleep_targets_select on public.sleep_targets for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where polname='sleep_targets_upsert') then
    create policy sleep_targets_upsert on public.sleep_targets for
      insert with check (auth.uid() = user_id);
    create policy sleep_targets_update on public.sleep_targets for
      update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end$$;

-- Indexes for performance
create index if not exists idx_sleep_logs_user_date on public.sleep_logs(user_id, date desc);
create index if not exists idx_sleep_logs_user_end_at on public.sleep_logs(user_id, end_at desc);

