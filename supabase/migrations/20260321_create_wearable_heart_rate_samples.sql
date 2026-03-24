-- Provider-agnostic wearable heart-rate samples.
-- This supports Android Health Connect / iOS HealthKit ingestion without relying on Google Fit APIs.

create table if not exists public.wearable_heart_rate_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null, -- e.g. health_connect | apple_health | google_fit
  bpm integer not null check (bpm > 0 and bpm < 300),
  recorded_at timestamptz not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_whrs_user_recorded_at
  on public.wearable_heart_rate_samples(user_id, recorded_at desc);

create unique index if not exists idx_whrs_dedupe
  on public.wearable_heart_rate_samples(user_id, source, recorded_at, bpm);

alter table public.wearable_heart_rate_samples enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wearable_heart_rate_samples'
      and policyname = 'whrs_select_own'
  ) then
    create policy whrs_select_own
      on public.wearable_heart_rate_samples
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wearable_heart_rate_samples'
      and policyname = 'whrs_insert_own'
  ) then
    create policy whrs_insert_own
      on public.wearable_heart_rate_samples
      for insert
      with check (auth.uid() = user_id);
  end if;
end
$$;

