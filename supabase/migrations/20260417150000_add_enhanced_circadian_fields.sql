alter table circadian_logs
  add column if not exists misalignment_hours numeric,
  add column if not exists fatigue_score      integer;
