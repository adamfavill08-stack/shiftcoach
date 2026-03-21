-- Add subscription_plan column to profiles table
-- This stores the user's selected pricing plan: 'monthly' or 'yearly'

-- Add column if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'subscription_plan'
  ) then
    alter table public.profiles 
    add column subscription_plan text check (subscription_plan in ('monthly', 'yearly', 'tester'));
  else
    -- Update existing constraint to include 'tester' if column exists
    alter table public.profiles 
    drop constraint if exists profiles_subscription_plan_check;
    alter table public.profiles 
    add constraint profiles_subscription_plan_check 
    check (subscription_plan in ('monthly', 'yearly', 'tester'));
  end if;
end $$;

-- Add comment
comment on column public.profiles.subscription_plan is 'User selected pricing plan: monthly, yearly, or tester';

-- Add Stripe-related columns for payment tracking
do $$
begin
  -- Add stripe_customer_id if it doesn't exist
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'stripe_customer_id'
  ) then
    alter table public.profiles 
    add column stripe_customer_id text;
  end if;

  -- Add stripe_subscription_id if it doesn't exist
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'stripe_subscription_id'
  ) then
    alter table public.profiles 
    add column stripe_subscription_id text;
  end if;

  -- Add subscription_status if it doesn't exist
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'subscription_status'
  ) then
    alter table public.profiles 
    add column subscription_status text check (subscription_status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete'));
  end if;
end $$;

-- Add indexes for Stripe lookups
create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id) where stripe_customer_id is not null;
create index if not exists profiles_stripe_subscription_id_idx on public.profiles(stripe_subscription_id) where stripe_subscription_id is not null;

