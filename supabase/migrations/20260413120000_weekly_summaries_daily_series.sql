-- Per-day series for dashboard weekly charts (body clock, sleep hours, timing).
alter table if exists public.weekly_summaries
  add column if not exists body_clock_scores jsonb not null default '[]'::jsonb,
  add column if not exists sleep_hours jsonb not null default '[]'::jsonb,
  add column if not exists sleep_timing_scores jsonb not null default '[]'::jsonb;

comment on column public.weekly_summaries.body_clock_scores is
  'Seven daily body-clock headline scores (0–100), aligned to week_start..+6 days.';
comment on column public.weekly_summaries.sleep_hours is
  'Seven daily main-sleep hours totals for the same calendar days.';
comment on column public.weekly_summaries.sleep_timing_scores is
  'Seven daily timing/consistency hints (0–100), derived from shift_rhythm_scores when present.';
