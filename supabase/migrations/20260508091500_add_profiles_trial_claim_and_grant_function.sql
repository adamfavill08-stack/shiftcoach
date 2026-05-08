-- One-time onboarding free-trial metadata + atomic grant RPC.
-- This function is intended to be called from server-side API only.

alter table public.profiles
  add column if not exists trial_started_at timestamptz;

alter table public.profiles
  add column if not exists trial_claimed_at timestamptz;

alter table public.profiles
  add column if not exists trial_source text;

comment on column public.profiles.trial_started_at is
  'Timestamp when one-time onboarding free trial first started.';

comment on column public.profiles.trial_claimed_at is
  'Timestamp when user claimed onboarding free trial (one-time marker).';

comment on column public.profiles.trial_source is
  'Source tag for trial grant, e.g. onboarding_free.';

alter table public.profiles
  drop constraint if exists profiles_trial_window_check;

alter table public.profiles
  add constraint profiles_trial_window_check
  check (
    trial_started_at is null
    or trial_ends_at is null
    or trial_ends_at >= trial_started_at
  );

create or replace function public.grant_free_trial_once(
  p_user_id uuid,
  p_days integer default 7,
  p_source text default 'onboarding_free'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_trial_ends_at timestamptz;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_days is null or p_days < 1 or p_days > 31 then
    raise exception 'p_days must be between 1 and 31';
  end if;

  select *
  into v_profile
  from public.profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'profile not found for user_id %', p_user_id;
  end if;

  -- Never downgrade active paid users.
  if (
    coalesce(v_profile.subscription_plan, '') in ('monthly', 'yearly', 'pro', 'tester')
    and (
      coalesce(v_profile.subscription_status, '') in ('active', 'trialing')
      or (
        jsonb_typeof(v_profile.revenuecat_entitlements) = 'object'
        and jsonb_typeof(v_profile.revenuecat_entitlements -> 'active') = 'object'
        and (v_profile.revenuecat_entitlements -> 'active' ? 'pro')
      )
    )
  ) then
    update public.profiles
    set onboarding_completed = true
    where user_id = p_user_id
      and onboarding_completed is distinct from true;

    return jsonb_build_object(
      'granted', false,
      'reason', 'already_paid',
      'trial_ends_at', v_profile.trial_ends_at
    );
  end if;

  -- One-time only: once claimed, never re-grant.
  if v_profile.trial_claimed_at is not null then
    update public.profiles
    set onboarding_completed = true
    where user_id = p_user_id
      and onboarding_completed is distinct from true;

    return jsonb_build_object(
      'granted', false,
      'reason', 'already_claimed',
      'trial_ends_at', v_profile.trial_ends_at
    );
  end if;

  v_trial_ends_at := now() + make_interval(days => p_days);

  update public.profiles
  set
    subscription_plan = 'free',
    subscription_status = 'trialing',
    trial_started_at = coalesce(trial_started_at, now()),
    trial_ends_at = v_trial_ends_at,
    trial_claimed_at = now(),
    trial_source = coalesce(nullif(p_source, ''), 'onboarding_free'),
    onboarding_completed = true
  where user_id = p_user_id;

  return jsonb_build_object(
    'granted', true,
    'reason', 'granted',
    'trial_ends_at', v_trial_ends_at
  );
end;
$$;

revoke all on function public.grant_free_trial_once(uuid, integer, text) from public;
grant execute on function public.grant_free_trial_once(uuid, integer, text) to authenticated;
grant execute on function public.grant_free_trial_once(uuid, integer, text) to service_role;
