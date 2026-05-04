-- Allow subscription_plan = 'pro' (RevenueCat Pro) and persist onboarding completion on profile.

alter table public.profiles
  drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (
    subscription_plan is null
    or subscription_plan in ('monthly', 'yearly', 'tester', 'free', 'pro')
  );

comment on column public.profiles.subscription_plan is
  'User plan: monthly, yearly, tester, free, pro (RevenueCat store Pro), or null.';

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

comment on column public.profiles.onboarding_completed is
  'True when the user has finished the product onboarding + plan step (or native Pro purchase).';
