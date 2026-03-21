alter table if exists public.shift_color_preferences
  add column if not exists colors jsonb;
