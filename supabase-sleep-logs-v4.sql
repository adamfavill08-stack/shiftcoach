-- sleep_logs table (final schema with type field)
-- Paste this in Supabase SQL Editor

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('sleep','nap')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  quality text,
  notes text,
  source text default 'manual',
  created_at timestamptz default now()
);

-- RLS
alter table public.sleep_logs enable row level security;

-- Drop existing policies if they exist
drop policy if exists "sleep_select" on public.sleep_logs;
drop policy if exists "sleep_insert" on public.sleep_logs;
drop policy if exists "sleep_update" on public.sleep_logs;
drop policy if exists "sleep_delete" on public.sleep_logs;

-- Create policies
create policy "sleep_select" on public.sleep_logs for select using (auth.uid() = user_id);
create policy "sleep_insert" on public.sleep_logs for insert with check (auth.uid() = user_id);
create policy "sleep_update" on public.sleep_logs for update using (auth.uid() = user_id);
create policy "sleep_delete" on public.sleep_logs for delete using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_sleep_logs_user_end_at on public.sleep_logs(user_id, end_at desc);
create index if not exists idx_sleep_logs_user_start_at on public.sleep_logs(user_id, start_at desc);
create index if not exists idx_sleep_logs_user_type on public.sleep_logs(user_id, type);

