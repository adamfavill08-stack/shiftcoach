-- Complete nutrition system setup
-- Run this in Supabase SQL Editor to set up the foods and nutrition_logs tables

-- ============================================
-- 1. Create foods table (global food database)
-- ============================================
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  barcode text,                -- may be null for generic foods
  name text not null,
  brand text,
  country text,
  source text,                 -- 'openfoodfacts' | 'usda' | 'manual' etc.

  kcal numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  fiber numeric,
  sugar numeric,
  salt numeric,

  portion_qty numeric,         -- e.g. 100
  portion_unit text,           -- 'g', 'ml', 'serving'
  image_url text,

  created_at timestamptz default now()
);

-- Clean up duplicate barcodes before creating unique index
-- Keep the most recent entry for each duplicate barcode
delete from public.foods
where id in (
  select id from (
    select id, row_number() over (partition by barcode order by created_at desc) as rn
    from public.foods
    where barcode is not null
  ) t
  where rn > 1
);

-- Create unique indexes
drop index if exists foods_barcode_idx;
create unique index foods_barcode_idx on public.foods(barcode) where barcode is not null;

drop index if exists foods_name_brand_idx;
create unique index foods_name_brand_idx on public.foods(name, brand) where brand is not null;

-- Create search indexes
create index if not exists foods_name_idx on public.foods using gin(to_tsvector('english', name));
create index if not exists foods_brand_idx on public.foods(brand) where brand is not null;
create index if not exists foods_source_idx on public.foods(source);

-- Enable RLS
alter table public.foods enable row level security;

-- Allow public read access (for food search)
drop policy if exists "foods_select_public" on public.foods;
create policy "foods_select_public"
  on public.foods for select
  using (true);

-- Only service role can insert/update/delete (use service role client in API routes)
drop policy if exists "foods_insert_service" on public.foods;
create policy "foods_insert_service"
  on public.foods for insert
  with check (false); -- Use service role client to bypass RLS

drop policy if exists "foods_update_service" on public.foods;
create policy "foods_update_service"
  on public.foods for update
  using (false); -- Use service role client to bypass RLS

drop policy if exists "foods_delete_service" on public.foods;
create policy "foods_delete_service"
  on public.foods for delete
  using (false); -- Use service role client to bypass RLS

-- ============================================
-- 2. Update nutrition_logs table schema
-- ============================================

-- Add new columns if they don't exist
alter table public.nutrition_logs 
  add column if not exists food_id uuid references public.foods(id),
  add column if not exists custom_name text,
  add column if not exists eaten_at timestamptz default now(),
  add column if not exists fiber numeric,
  add column if not exists sugar numeric,
  add column if not exists salt numeric,
  add column if not exists portion_qty numeric,
  add column if not exists portion_unit text,
  add column if not exists kcal numeric;

-- Migrate existing data: copy logged_at to eaten_at if eaten_at is null
update public.nutrition_logs 
set eaten_at = logged_at 
where eaten_at is null and logged_at is not null;

-- Migrate existing data: copy calories to kcal if kcal is null
update public.nutrition_logs 
set kcal = calories 
where kcal is null and calories is not null;

-- Set default for eaten_at
alter table public.nutrition_logs
  alter column eaten_at set default now();

-- Update indexes to use eaten_at
drop index if exists idx_nutrition_logs_user_logged_at;
create index if not exists idx_nutrition_logs_user_eaten_at 
  on public.nutrition_logs(user_id, eaten_at desc);

-- Add index on food_id for joins
create index if not exists idx_nutrition_logs_food_id 
  on public.nutrition_logs(food_id) where food_id is not null;

-- Ensure meal_type constraint exists
alter table public.nutrition_logs
  drop constraint if exists nutrition_logs_meal_type_check;

alter table public.nutrition_logs
  add constraint nutrition_logs_meal_type_check 
  check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'));

-- Ensure RLS policies exist
alter table public.nutrition_logs enable row level security;

drop policy if exists "nutrition_logs_select_own" on public.nutrition_logs;
create policy "nutrition_logs_select_own"
  on public.nutrition_logs for select
  using (auth.uid() = user_id);

drop policy if exists "nutrition_logs_insert_own" on public.nutrition_logs;
create policy "nutrition_logs_insert_own"
  on public.nutrition_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "nutrition_logs_update_own" on public.nutrition_logs;
create policy "nutrition_logs_update_own"
  on public.nutrition_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "nutrition_logs_delete_own" on public.nutrition_logs;
create policy "nutrition_logs_delete_own"
  on public.nutrition_logs for delete
  using (auth.uid() = user_id);

