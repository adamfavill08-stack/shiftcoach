-- Account deletion compliance support:
-- 1) Public-facing deletion request intake table
-- 2) Service-role callable function to delete all user-scoped data in public schema

create table if not exists public.account_deletion_requests (
  id bigserial primary key,
  email text not null,
  user_id uuid null,
  reason text null,
  source text not null default 'web',
  status text not null default 'pending',
  requested_at timestamptz not null default now()
);

create index if not exists idx_account_deletion_requests_email
  on public.account_deletion_requests (email);

create index if not exists idx_account_deletion_requests_requested_at
  on public.account_deletion_requests (requested_at desc);

alter table public.account_deletion_requests disable row level security;

create or replace function public.delete_user_account_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  rows_deleted integer;
  total_deleted integer := 0;
  per_table jsonb := '{}'::jsonb;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  -- Delete from every public table that has a uuid user_id column,
  -- except this intake table where user_id is optional metadata.
  for rec in
    select c.table_schema, c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and c.udt_name = 'uuid'
      and c.table_name <> 'account_deletion_requests'
    order by c.table_name
  loop
    execute format('delete from %I.%I where user_id = $1', rec.table_schema, rec.table_name)
    using p_user_id;

    get diagnostics rows_deleted = row_count;
    total_deleted := total_deleted + rows_deleted;
    per_table := per_table || jsonb_build_object(rec.table_name, rows_deleted);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'total_deleted_rows', total_deleted,
    'tables', per_table
  );
end;
$$;

revoke all on function public.delete_user_account_data(uuid) from public;

