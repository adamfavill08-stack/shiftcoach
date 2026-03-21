-- Add region and currency fields to profiles for localisation

do $$
begin
  -- Region where the user mainly works (for currency / wording)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'region'
  ) then
    alter table public.profiles
      add column region text;
  end if;

  -- Preferred billing / display currency (e.g. GBP, USD, EUR, AUD)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'currency'
  ) then
    alter table public.profiles
      add column currency text;
  end if;
end $$;


