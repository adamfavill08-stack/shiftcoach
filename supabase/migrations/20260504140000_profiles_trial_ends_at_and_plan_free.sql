-- trial_ends_at: set when user picks free trial on onboarding plan
-- subscription_plan: allow 'free' (was monthly/yearly/tester only)

alter table public.profiles
  add column if not exists trial_ends_at timestamptz;

comment on column public.profiles.trial_ends_at is
  'When the app-managed free trial window ends (set from /api/onboarding/plan when selection is free).';

alter table public.profiles
  drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (
    subscription_plan is null
    or subscription_plan in ('monthly', 'yearly', 'tester', 'free')
  );

comment on column public.profiles.subscription_plan is
  'User plan: monthly, yearly, tester, free (onboarding trial), or null.';
