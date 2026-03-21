-- Add Row Level Security (RLS) to shifts table
-- This ensures users can only see and modify their own shifts

-- Enable RLS on shifts table
alter table public.shifts enable row level security;

-- Drop existing policies if they exist (idempotent)
drop policy if exists "shifts_select_own" on public.shifts;
drop policy if exists "shifts_insert_own" on public.shifts;
drop policy if exists "shifts_update_own" on public.shifts;
drop policy if exists "shifts_delete_own" on public.shifts;

-- Users can only SELECT their own shifts
create policy "shifts_select_own"
  on public.shifts for select
  using (auth.uid() = user_id);

-- Users can only INSERT shifts with their own user_id
create policy "shifts_insert_own"
  on public.shifts for insert
  with check (auth.uid() = user_id);

-- Users can only UPDATE their own shifts
create policy "shifts_update_own"
  on public.shifts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only DELETE their own shifts
create policy "shifts_delete_own"
  on public.shifts for delete
  using (auth.uid() = user_id);

-- Note: This migration is idempotent - safe to run multiple times
