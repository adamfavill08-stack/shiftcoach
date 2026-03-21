-- Speed up weekly strip queries
create index if not exists idx_shifts_user_date on public.shifts(user_id, date);
