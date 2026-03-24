-- Enforce deterministic idempotency for sleep ingestion across replayed sync windows.
-- Canonical identity: user + provider source + start/end timestamps.

create unique index if not exists idx_sleep_records_dedupe
  on public.sleep_records(user_id, source, start_at, end_at);

