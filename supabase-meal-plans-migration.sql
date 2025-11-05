-- Migration script to add thumbnail_url column to existing meal_plans table
-- Run this if you get "column does not exist" errors

-- Add thumbnail_url column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                 and table_name = 'meal_plans'
                 and column_name = 'thumbnail_url') then
    alter table public.meal_plans add column thumbnail_url text;
  end if;
end $$;

