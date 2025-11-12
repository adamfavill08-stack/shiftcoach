-- rota_events table for personal events on monthly rota
create table if not exists public.rota_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  start_time time without time zone null,
  end_time time without time zone null,
  all_day boolean not null default true,
  color text null,
  notes text null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.rota_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'rota_events'
      and policyname = 'Users can CRUD their own events'
  ) then
    create policy "Users can CRUD their own events"
      on public.rota_events
      as permissive
      for all
      to authenticated
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_rota_events_user_date on public.rota_events (user_id, date);
