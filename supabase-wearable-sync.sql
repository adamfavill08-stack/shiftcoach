-- device_sources: what sources we've connected per user
create table if not exists public.device_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios_healthkit','android_googlefit')),
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, platform)
);

-- normalized sleep records
create table if not exists public.sleep_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,                -- 'healthkit' | 'googlefit'
  start_at timestamptz not null,
  end_at timestamptz not null,
  stage text check (stage in ('asleep','inbed','light','deep','rem','awake')),
  quality text,                        -- 'poor'|'fair'|'good'|'excellent' (optional)
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_sleep_user_time
  on public.sleep_records(user_id, start_at);

-- basic RLS (dev: allow your fallback user)
alter table public.device_sources enable row level security;
alter table public.sleep_records enable row level security;

create policy "sleep_self_read" on public.sleep_records
for select using (auth.uid() = user_id);

create policy "sleep_self_write" on public.sleep_records
for insert with check (auth.uid() = user_id);

create policy "sleep_self_update" on public.sleep_records
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sources_self_all" on public.device_sources
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

