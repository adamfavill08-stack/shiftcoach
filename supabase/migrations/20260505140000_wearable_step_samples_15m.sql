-- 15-minute wearable step buckets (Health Connect / future sources) for precise shift-window analytics.
create table if not exists public.wearable_step_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  activity_date date,
  bucket_start_utc timestamptz not null,
  bucket_end_utc timestamptz,
  steps integer not null check (steps >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wearable_step_samples_user_source_start_uidx
  on public.wearable_step_samples(user_id, source, bucket_start_utc);

create index if not exists wearable_step_samples_user_start_idx
  on public.wearable_step_samples(user_id, bucket_start_utc desc);

create index if not exists wearable_step_samples_user_activity_date_idx
  on public.wearable_step_samples(user_id, activity_date);

create or replace function public.set_wearable_step_samples_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wearable_step_samples_updated_at on public.wearable_step_samples;
create trigger trg_wearable_step_samples_updated_at
before update on public.wearable_step_samples
for each row
execute function public.set_wearable_step_samples_updated_at();

alter table public.wearable_step_samples enable row level security;

drop policy if exists "wearable_step_samples_self_read" on public.wearable_step_samples;
create policy "wearable_step_samples_self_read"
on public.wearable_step_samples
for select
using (auth.uid() = user_id);
