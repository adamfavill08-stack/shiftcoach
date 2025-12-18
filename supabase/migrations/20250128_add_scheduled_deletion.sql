-- Add scheduled_deletion_at column to profiles table
-- This stores when the account should be deleted after subscription cancellation

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'scheduled_deletion_at'
  ) then
    alter table public.profiles 
    add column scheduled_deletion_at timestamptz;
  end if;
end $$;

-- Add comment
comment on column public.profiles.scheduled_deletion_at is 'When the account should be deleted after subscription cancellation (end of paid period)';

-- Add index for finding accounts ready for deletion
create index if not exists profiles_scheduled_deletion_at_idx 
on public.profiles(scheduled_deletion_at) 
where scheduled_deletion_at is not null;

