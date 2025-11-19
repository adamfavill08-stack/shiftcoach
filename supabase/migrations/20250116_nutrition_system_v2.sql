-- Comprehensive Nutrition System v2
-- NutriCheck/MyFitnessPal-style food logging

-- ============================================
-- 1. GLOBAL FOODS
-- ============================================

-- Table: foods_master
create table if not exists public.foods_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  barcode text,
  country text,
  source text not null default 'openfoodfacts',
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  fiber_per_100g numeric,
  sugar_per_100g numeric,
  salt_per_100g numeric,
  serving_description text,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for foods_master
create index if not exists foods_master_barcode_idx on public.foods_master(barcode) where barcode is not null;
create index if not exists foods_master_name_idx on public.foods_master using gin(to_tsvector('english', name));
create index if not exists foods_master_brand_idx on public.foods_master(brand) where brand is not null;
create index if not exists foods_master_country_idx on public.foods_master(country) where country is not null;
create index if not exists foods_master_source_idx on public.foods_master(source);

-- Enable RLS (public read, service role write)
alter table public.foods_master enable row level security;

drop policy if exists "foods_master_select_public" on public.foods_master;
create policy "foods_master_select_public"
  on public.foods_master for select
  using (true);

-- ============================================
-- 2. USER CUSTOM FOODS
-- ============================================

create table if not exists public.user_custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  barcode text,
  country text,
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  fiber_per_100g numeric,
  sugar_per_100g numeric,
  salt_per_100g numeric,
  serving_description text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists user_custom_foods_user_id_idx on public.user_custom_foods(user_id);
create index if not exists user_custom_foods_barcode_idx on public.user_custom_foods(user_id, barcode) where barcode is not null;

-- Enable RLS
alter table public.user_custom_foods enable row level security;

drop policy if exists "user_custom_foods_select_own" on public.user_custom_foods;
create policy "user_custom_foods_select_own"
  on public.user_custom_foods for select
  using (auth.uid() = user_id);

drop policy if exists "user_custom_foods_insert_own" on public.user_custom_foods;
create policy "user_custom_foods_insert_own"
  on public.user_custom_foods for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_custom_foods_update_own" on public.user_custom_foods;
create policy "user_custom_foods_update_own"
  on public.user_custom_foods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_custom_foods_delete_own" on public.user_custom_foods;
create policy "user_custom_foods_delete_own"
  on public.user_custom_foods for delete
  using (auth.uid() = user_id);

-- ============================================
-- 3. FOOD PORTIONS
-- ============================================

create table if not exists public.food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods_master(id) on delete cascade,
  label text not null,
  grams numeric not null,
  created_at timestamptz default now()
);

create index if not exists food_portions_food_id_idx on public.food_portions(food_id);

-- ============================================
-- 4. RECIPES
-- ============================================

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  servings numeric not null default 1,
  total_kcal numeric,
  total_protein numeric,
  total_carbs numeric,
  total_fat numeric,
  total_fiber numeric,
  total_sugar numeric,
  total_salt numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists recipes_user_id_idx on public.recipes(user_id);

-- Enable RLS
alter table public.recipes enable row level security;

drop policy if exists "recipes_select_own" on public.recipes;
create policy "recipes_select_own"
  on public.recipes for select
  using (auth.uid() = user_id);

drop policy if exists "recipes_insert_own" on public.recipes;
create policy "recipes_insert_own"
  on public.recipes for insert
  with check (auth.uid() = user_id);

drop policy if exists "recipes_update_own" on public.recipes;
create policy "recipes_update_own"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "recipes_delete_own" on public.recipes;
create policy "recipes_delete_own"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- ============================================
-- 5. RECIPE INGREDIENTS
-- ============================================

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid references public.foods_master(id),
  custom_food_id uuid references public.user_custom_foods(id),
  amount_grams numeric not null,
  notes text,
  constraint recipe_ingredients_food_check check (
    (food_id is not null and custom_food_id is null) or
    (food_id is null and custom_food_id is not null)
  )
);

create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients(recipe_id);
create index if not exists recipe_ingredients_food_id_idx on public.recipe_ingredients(food_id) where food_id is not null;
create index if not exists recipe_ingredients_custom_food_id_idx on public.recipe_ingredients(custom_food_id) where custom_food_id is not null;

-- Enable RLS (via recipe ownership)
alter table public.recipe_ingredients enable row level security;

drop policy if exists "recipe_ingredients_select_own" on public.recipe_ingredients;
create policy "recipe_ingredients_select_own"
  on public.recipe_ingredients for select
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

drop policy if exists "recipe_ingredients_insert_own" on public.recipe_ingredients;
create policy "recipe_ingredients_insert_own"
  on public.recipe_ingredients for insert
  with check (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

drop policy if exists "recipe_ingredients_update_own" on public.recipe_ingredients;
create policy "recipe_ingredients_update_own"
  on public.recipe_ingredients for update
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

drop policy if exists "recipe_ingredients_delete_own" on public.recipe_ingredients;
create policy "recipe_ingredients_delete_own"
  on public.recipe_ingredients for delete
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

-- ============================================
-- 6. UPDATE NUTRITION_LOGS TABLE
-- ============================================

-- Add columns if they don't exist
alter table public.nutrition_logs
  add column if not exists food_id uuid references public.foods_master(id),
  add column if not exists custom_food_id uuid references public.user_custom_foods(id),
  add column if not exists recipe_id uuid references public.recipes(id),
  add column if not exists quantity_grams numeric,
  add column if not exists fiber numeric,
  add column if not exists sugar numeric,
  add column if not exists salt numeric,
  add column if not exists source text default 'manual';

-- Migrate existing data: if we have old portion-based columns, convert to grams
-- This is a placeholder - adjust based on your existing schema
do $$
begin
  -- If quantity_grams is null but we have old portion data, try to estimate
  -- This is a migration helper - adjust as needed
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'nutrition_logs' 
    and column_name = 'portion_multiplier'
  ) then
    -- Estimate grams from portion_multiplier (assuming 100g base)
    update public.nutrition_logs
    set quantity_grams = portion_multiplier * 100
    where quantity_grams is null and portion_multiplier is not null;
  end if;
end $$;

-- Create indexes
create index if not exists nutrition_logs_food_id_idx on public.nutrition_logs(food_id) where food_id is not null;
create index if not exists nutrition_logs_custom_food_id_idx on public.nutrition_logs(custom_food_id) where custom_food_id is not null;
create index if not exists nutrition_logs_recipe_id_idx on public.nutrition_logs(recipe_id) where recipe_id is not null;
create index if not exists nutrition_logs_logged_at_idx on public.nutrition_logs(user_id, logged_at desc);

-- ============================================
-- 7. USER FAVOURITE FOODS
-- ============================================

create table if not exists public.user_favourite_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods_master(id),
  custom_food_id uuid references public.user_custom_foods(id),
  created_at timestamptz default now(),
  constraint user_favourite_foods_food_check check (
    (food_id is not null and custom_food_id is null) or
    (food_id is null and custom_food_id is not null)
  ),
  unique(user_id, food_id, custom_food_id)
);

create index if not exists user_favourite_foods_user_id_idx on public.user_favourite_foods(user_id);

-- Enable RLS
alter table public.user_favourite_foods enable row level security;

drop policy if exists "user_favourite_foods_select_own" on public.user_favourite_foods;
create policy "user_favourite_foods_select_own"
  on public.user_favourite_foods for select
  using (auth.uid() = user_id);

drop policy if exists "user_favourite_foods_insert_own" on public.user_favourite_foods;
create policy "user_favourite_foods_insert_own"
  on public.user_favourite_foods for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_favourite_foods_delete_own" on public.user_favourite_foods;
create policy "user_favourite_foods_delete_own"
  on public.user_favourite_foods for delete
  using (auth.uid() = user_id);

