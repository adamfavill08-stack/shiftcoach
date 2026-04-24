alter table profiles
  add column if not exists worker_type text,
  add column if not exists cycle_length integer,
  add column if not exists rotation_pattern jsonb,
  add column if not exists shift_times jsonb,
  add column if not exists rotation_anchor_date date,
  add column if not exists rotation_anchor_day integer,
  add column if not exists weekend_extension text;
