-- Final Google Fit decommission cleanup.
-- Safe to run once all environments are migrated to Health Connect / Apple Health.

drop trigger if exists set_google_fit_tokens_updated_at_trigger on public.google_fit_tokens;
drop function if exists public.set_google_fit_tokens_updated_at();

drop policy if exists google_fit_tokens_select_own on public.google_fit_tokens;
drop policy if exists google_fit_tokens_upsert_own on public.google_fit_tokens;
drop policy if exists google_fit_tokens_update_own on public.google_fit_tokens;

drop table if exists public.google_fit_tokens;

