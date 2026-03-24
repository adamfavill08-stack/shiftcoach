# Google Fit Decommission Checklist

Status: strategic migration complete in application runtime.

## What is already done

- All `app/api/google-fit/*` routes now return explicit deprecation behavior (`410` or dashboard redirect).
- Active wearable data paths are provider-agnostic and Health Connect / Apple Health based:
  - `app/api/health-connect/sync/route.ts`
  - `app/api/sync/ingest/route.ts`
  - `app/api/wearables/status/route.ts`
  - `app/api/wearables/sync/route.ts`
  - `app/api/wearables/heart-rate/route.ts`
- UI no longer depends on Google Fit-only error paths.

## Rollout steps

1. Deploy app changes to all environments.
2. Monitor wearable ingestion for at least one full release cycle.
3. Confirm no clients still rely on `google_fit_tokens`.
4. Run DB migration: `supabase/migrations/20260321_drop_google_fit_tokens.sql`.
5. Remove legacy Google Fit env vars from deployment secrets when no longer needed:
   - `GOOGLE_FIT_CLIENT_ID`
   - `GOOGLE_FIT_CLIENT_SECRET`
   - `GOOGLE_FIT_REDIRECT_URI`
   - `GOOGLE_FIT_REDIRECT_URI_LOCAL`
6. Remove legacy docs/playbooks that assume Google Fit OAuth.

## Verification

- `/api/wearables/status` returns provider info from `device_sources`.
- `/api/wearables/heart-rate` returns 404 `no_wearable_connection` if no ingested HR samples exist.
- `/api/google-fit/auth` returns `410`.
- `/api/google-fit/steps` returns `410`.

