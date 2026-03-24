create table if not exists public.export_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null default 'json',
  requested_at timestamptz not null default now(),
  ip text,
  user_agent text,
  status text not null default 'success'
);

create index if not exists idx_export_audit_logs_user_requested
  on public.export_audit_logs(user_id, requested_at desc);

alter table public.export_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'export_audit_logs'
      and policyname = 'export_audit_logs_select_own'
  ) then
    create policy export_audit_logs_select_own
      on public.export_audit_logs
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

