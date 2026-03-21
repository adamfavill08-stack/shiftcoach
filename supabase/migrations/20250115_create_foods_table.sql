-- Global foods master table (normalized products)
-- This replaces nutrition_foods and uses the exact schema specified

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

-- Create unique indexes
create unique index if not exists foods_barcode_idx on public.foods(barcode) where barcode is not null;
create unique index if not exists foods_name_brand_idx on public.foods(name, brand) where brand is not null;

-- Create search indexes
create index if not exists foods_name_idx on public.foods using gin(to_tsvector('english', name));
create index if not exists foods_brand_idx on public.foods(brand) where brand is not null;
create index if not exists foods_source_idx on public.foods(source);

-- Enable RLS
alter table public.foods enable row level security;

-- Allow public read access (for food search)
create policy "foods_select_public"
  on public.foods for select
  using (true);

-- Only service role can insert/update/delete
create policy "foods_insert_service"
  on public.foods for insert
  with check (false); -- Use service role client to bypass RLS

create policy "foods_update_service"
  on public.foods for update
  using (false); -- Use service role client to bypass RLS

create policy "foods_delete_service"
  on public.foods for delete
  using (false); -- Use service role client to bypass RLS

