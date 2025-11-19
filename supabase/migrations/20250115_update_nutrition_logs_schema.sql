-- Update nutrition_logs to match the specified schema
-- This adds food_id, custom_name, eaten_at, and additional macro fields

-- Add new columns if they don't exist
alter table public.nutrition_logs 
  add column if not exists food_id uuid references public.foods(id),
  add column if not exists custom_name text,
  add column if not exists eaten_at timestamptz default now(),
  add column if not exists fiber numeric,
  add column if not exists sugar numeric,
  add column if not exists salt numeric,
  add column if not exists portion_qty numeric,
  add column if not exists portion_unit text;

-- Rename logged_at to eaten_at if needed (keep both for backward compatibility)
-- Update constraint to use eaten_at
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

