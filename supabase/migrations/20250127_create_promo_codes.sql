-- Promo codes table for tester access
-- This allows tracking of promo code usage

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  is_active boolean not null default true,
  max_uses integer, -- null = unlimited
  current_uses integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for quick lookups
create index if not exists promo_codes_code_idx on public.promo_codes(code) where is_active = true;

-- Enable RLS
alter table public.promo_codes enable row level security;

-- Public read access for active codes (for validation)
create policy "promo_codes_select_active"
  on public.promo_codes for select
  using (is_active = true);

-- Track promo code usage
create table if not exists public.promo_code_usage (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid references public.promo_codes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  used_at timestamptz default now(),
  unique(promo_code_id, user_id) -- Prevent duplicate usage per user
);

-- Enable RLS
alter table public.promo_code_usage enable row level security;

-- Users can see their own usage
create policy "promo_code_usage_select_own"
  on public.promo_code_usage for select
  using (auth.uid() = user_id);

-- Users can insert their own usage
create policy "promo_code_usage_insert_own"
  on public.promo_code_usage for insert
  with check (auth.uid() = user_id);

-- Insert 5 single-use tester codes
-- These codes can only be used once each
insert into public.promo_codes (code, description, max_uses, expires_at) values
  ('TESTER001', 'Single-use tester code #1', 1, null),
  ('TESTER002', 'Single-use tester code #2', 1, null),
  ('TESTER003', 'Single-use tester code #3', 1, null),
  ('TESTER004', 'Single-use tester code #4', 1, null),
  ('TESTER005', 'Single-use tester code #5', 1, null)
on conflict (code) do nothing;

