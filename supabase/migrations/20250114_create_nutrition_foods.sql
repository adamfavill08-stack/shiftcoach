-- Create nutrition_foods table for storing food database
-- This table stores foods from various sources (OpenFoodFacts, CoFID, USDA, AUSNUT, etc.)

create table if not exists public.nutrition_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  barcode text,
  serving_size numeric not null default 100,
  serving_unit text not null default 'g',
  calories_per_serving numeric not null default 0,
  protein_per_serving numeric not null default 0,
  carbs_per_serving numeric not null default 0,
  fat_per_serving numeric not null default 0,
  source text not null default 'manual', -- 'openfoodfacts', 'cofid', 'usda', 'ausnut', 'recipe_parser', 'manual'
  external_id text, -- External system ID (e.g., 'usda_12345')
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint nutrition_foods_source_check check (source in ('openfoodfacts', 'cofid', 'usda', 'ausnut', 'recipe_parser', 'manual'))
);

-- Create unique indexes
create unique index if not exists nutrition_foods_barcode_idx on public.nutrition_foods(barcode) where barcode is not null;
create unique index if not exists nutrition_foods_name_brand_idx on public.nutrition_foods(name, brand) where brand is not null;

-- Create search indexes
create index if not exists nutrition_foods_name_idx on public.nutrition_foods using gin(to_tsvector('english', name));
create index if not exists nutrition_foods_brand_idx on public.nutrition_foods(brand) where brand is not null;
create index if not exists nutrition_foods_source_idx on public.nutrition_foods(source);

-- Enable RLS (optional, can be disabled for public read access)
alter table public.nutrition_foods enable row level security;

-- Allow public read access (for food search)
create policy "nutrition_foods_select_public"
  on public.nutrition_foods for select
  using (true);

-- Only service role can insert/update/delete
create policy "nutrition_foods_insert_service"
  on public.nutrition_foods for insert
  with check (false); -- Use service role client to bypass RLS

create policy "nutrition_foods_update_service"
  on public.nutrition_foods for update
  using (false); -- Use service role client to bypass RLS

create policy "nutrition_foods_delete_service"
  on public.nutrition_foods for delete
  using (false); -- Use service role client to bypass RLS

-- Add updated_at trigger
create or replace function update_nutrition_foods_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists nutrition_foods_updated_at_trigger on public.nutrition_foods;
create trigger nutrition_foods_updated_at_trigger
  before update on public.nutrition_foods
  for each row
  execute function update_nutrition_foods_updated_at();

