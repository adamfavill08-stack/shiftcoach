-- Table to store Google Fit OAuth tokens per user

create table if not exists public.google_fit_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: each user can only see/update their own row
alter table public.google_fit_tokens enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'google_fit_tokens' 
      and policyname = 'google_fit_tokens_select_own'
  ) then
    create policy google_fit_tokens_select_own
      on public.google_fit_tokens
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'google_fit_tokens' 
      and policyname = 'google_fit_tokens_upsert_own'
  ) then
    create policy google_fit_tokens_upsert_own
      on public.google_fit_tokens
      for insert
      with check (auth.uid() = user_id);

    create policy google_fit_tokens_update_own
      on public.google_fit_tokens
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Simple trigger to keep updated_at fresh
create or replace function public.set_google_fit_tokens_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_google_fit_tokens_updated_at_trigger'
      and tgrelid = 'public.google_fit_tokens'::regclass
  ) then
    create trigger set_google_fit_tokens_updated_at_trigger
      before update on public.google_fit_tokens
      for each row
      execute function public.set_google_fit_tokens_updated_at();
  end if;
end $$;


