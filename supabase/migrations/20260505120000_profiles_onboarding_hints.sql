-- Guided dashboard hints / onboarding tour (optional; persisted on profile).

alter table public.profiles
  add column if not exists onboarding_hints_enabled boolean,
  add column if not exists onboarding_hints_completed boolean not null default false,
  add column if not exists onboarding_step smallint not null default 0;

comment on column public.profiles.onboarding_hints_enabled is
  'NULL = not chosen yet; true = user opted into guided hints; false = declined or dismissed.';
comment on column public.profiles.onboarding_hints_completed is
  'When true, intro + tour will not show until user resets from Settings.';
comment on column public.profiles.onboarding_step is
  'Active tour step 1–4 while hints are enabled and not completed; 0 when idle.';

-- Existing accounts: avoid showing the intro to everyone on next deploy.
update public.profiles
set
  onboarding_hints_completed = true,
  onboarding_hints_enabled = coalesce(onboarding_hints_enabled, false),
  onboarding_step = 0
where onboarding_hints_enabled is null
  and onboarding_hints_completed is not true;
