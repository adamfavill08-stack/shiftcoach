-- Comprehensive Nutrition System Schema
-- Supports multi-food meals, recipes, custom foods, favourites, and international foods

-- ============================================
-- 1. Food Sources (reference table)
-- ============================================
create table if not exists public.food_sources (
  id text primary key, -- 'USDA', 'OpenFoodFacts', 'UserCreated', 'Restaurant', 'CoFID', 'AUSNUT'
  name text not null,
  description text,
  created_at timestamptz default now()
);

insert into public.food_sources (id, name, description) values
  ('USDA', 'USDA FoodData Central', 'US government food database'),
  ('OpenFoodFacts', 'Open Food Facts', 'Open database of food products'),
  ('UserCreated', 'User Created', 'Foods created by users'),
  ('Restaurant', 'Restaurant', 'Restaurant menu items'),
  ('CoFID', 'CoFID', 'UK Composition of Foods Integrated Dataset'),
  ('AUSNUT', 'AUSNUT', 'Australian Food Composition Database')
on conflict (id) do nothing;

-- ============================================
-- 2. Food Brands (reference table)
-- ============================================
create table if not exists public.food_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  created_at timestamptz default now(),
  unique(name, country)
);

create index if not exists food_brands_name_idx on public.food_brands(name);

-- ============================================
-- 3. Foods Master (global food database)
-- ============================================
create table if not exists public.foods_master (
  id uuid primary key default gen_random_uuid(),
  barcode text,
  name text not null,
  brand_id uuid references public.food_brands(id),
  brand_name text, -- Denormalized for quick access
  country text,
  source_id text not null references public.food_sources(id),
  
  -- Nutrition per 100g (standardized)
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  fiber_per_100g numeric,
  sugar_per_100g numeric,
  salt_per_100g numeric,
  
  -- Default portion
  default_portion_qty numeric default 100,
  default_portion_unit text default 'g',
  
  image_url text,
  last_updated timestamptz default now(),
  created_at timestamptz default now()
);

-- Clean up duplicate barcodes before creating unique index
delete from public.foods_master
where id in (
  select id from (
    select id, row_number() over (partition by barcode order by last_updated desc) as rn
    from public.foods_master
    where barcode is not null
  ) t
  where rn > 1
);

-- Create indexes
drop index if exists foods_master_barcode_idx;
create unique index foods_master_barcode_idx on public.foods_master(barcode) where barcode is not null;

drop index if exists foods_master_name_brand_idx;
create index foods_master_name_brand_idx on public.foods_master(name, brand_name) where brand_name is not null;

create index if not exists foods_master_name_idx on public.foods_master using gin(to_tsvector('english', name));
create index if not exists foods_master_brand_name_idx on public.foods_master(brand_name) where brand_name is not null;
create index if not exists foods_master_source_idx on public.foods_master(source_id);
create index if not exists foods_master_country_idx on public.foods_master(country) where country is not null;

-- Enable RLS
alter table public.foods_master enable row level security;

drop policy if exists "foods_master_select_public" on public.foods_master;
create policy "foods_master_select_public"
  on public.foods_master for select
  using (true);

-- ============================================
-- 4. Food Portions (custom portion sizes for foods)
-- ============================================
create table if not exists public.food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods_master(id) on delete cascade,
  name text not null, -- e.g., "1 slice", "1 cup", "100g"
  qty numeric not null,
  unit text not null, -- 'g', 'ml', 'piece', 'cup', etc.
  created_at timestamptz default now(),
  unique(food_id, name, qty, unit)
);

create index if not exists food_portions_food_id_idx on public.food_portions(food_id);

-- ============================================
-- 5. User Custom Foods
-- ============================================
create table if not exists public.user_custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  barcode text,
  name text not null,
  brand_name text,
  country text,
  
  -- Nutrition per 100g
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  fiber_per_100g numeric,
  sugar_per_100g numeric,
  salt_per_100g numeric,
  
  -- Default portion
  default_portion_qty numeric default 100,
  default_portion_unit text default 'g',
  
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
-- 6. User Favourite Foods
-- ============================================
create table if not exists public.user_favourite_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_type text not null, -- 'master' | 'custom'
  food_id uuid not null, -- references foods_master.id or user_custom_foods.id
  created_at timestamptz default now(),
  unique(user_id, food_type, food_id)
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

-- ============================================
-- 7. Recipes
-- ============================================
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  servings numeric default 1,
  image_url text,
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
-- 8. Recipe Ingredients
-- ============================================
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_type text not null, -- 'master' | 'custom'
  ingredient_id uuid not null, -- references foods_master.id or user_custom_foods.id
  qty numeric not null,
  unit text not null,
  created_at timestamptz default now()
);

create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients(recipe_id);

-- Enable RLS
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
-- 9. Update nutrition_logs to support multi-food meals
-- ============================================
-- Add meal_id to group foods in the same meal
alter table public.nutrition_logs
  add column if not exists meal_id uuid,
  add column if not exists meal_item_index integer default 0; -- Order within meal

create index if not exists nutrition_logs_meal_id_idx on public.nutrition_logs(meal_id) where meal_id is not null;

-- Update foreign key to support both foods_master and user_custom_foods
-- food_id can reference either table, we'll handle this in application logic

-- ============================================
-- 10. Migrate existing foods table to foods_master
-- ============================================
-- If foods table exists, migrate data to foods_master
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'foods') then
    -- Migrate foods to foods_master
    insert into public.foods_master (
      id, barcode, name, brand_name, country, source_id,
      kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
      fiber_per_100g, sugar_per_100g, salt_per_100g,
      default_portion_qty, default_portion_unit, image_url, created_at
    )
    select 
      id, barcode, name, brand, country, 
      coalesce(source, 'OpenFoodFacts'),
      -- Convert per-serving to per-100g
      case 
        when portion_qty > 0 then (kcal / portion_qty) * 100
        else kcal
      end,
      case 
        when portion_qty > 0 then (protein / portion_qty) * 100
        else protein
      end,
      case 
        when portion_qty > 0 then (carbs / portion_qty) * 100
        else carbs
      end,
      case 
        when portion_qty > 0 then (fat / portion_qty) * 100
        else fat
      end,
      case 
        when portion_qty > 0 then (fiber / portion_qty) * 100
        else fiber
      end,
      case 
        when portion_qty > 0 then (sugar / portion_qty) * 100
        else sugar
      end,
      case 
        when portion_qty > 0 then (salt / portion_qty) * 100
        else salt
      end,
      portion_qty, portion_unit, image_url, created_at
    from public.foods
    on conflict (id) do nothing;
  end if;
end $$;

