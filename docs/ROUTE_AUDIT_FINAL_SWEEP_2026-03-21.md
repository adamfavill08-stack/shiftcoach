# Route Audit Final Sweep - 2026-03-21

Scope: `app/api/**/route.ts`

## Snapshot

- Total route files: **93**
- Routes with explicit centralized auth helper usage: **76**
- Routes with service-role references: **58**
- Routes with explicit production guard (`NODE_ENV === 'production'`): **3**
- Routes with rate-limit/throttle references: **5**

## Validation Coverage Progress

Validation baseline has been rolled out aggressively using:
- `lib/api/validation.ts` (`parseJsonBody`)
- `lib/api/response.ts` (standardized error helpers)
- `zod` schemas in hardened routes

Current direct body-parse footprint:
- Routes still using direct `req.json(...)` in the previously identified final queue: **0**
- Final queue now converted in this pass:
  - `app/api/sleep/sessions/[id]/route.ts`
  - `app/api/rota/pattern/route.ts`
  - `app/api/sleep/social-jetlag-suggestions/route.ts`
  - `app/api/sleep/predict-stages/route.ts`
  - `app/api/sleep/metrics-suggestions/route.ts`
  - `app/api/sleep/predict/route.ts`

Routes with zod/`parseJsonBody` present: **27**
- `app/api/profile/route.ts`
- `app/api/activity/log/route.ts`
- `app/api/coach/route.ts`
- `app/api/revenuecat/validate-receipt/route.ts`
- `app/api/promo/validate/route.ts`
- `app/api/rota/apply/route.ts`
- `app/api/rota/event/route.ts`
- `app/api/sleep/log/[id]/route.ts`
- `app/api/sleep/log/route.ts`
- `app/api/shifts/route.ts`
- `app/api/feedback/route.ts`
- `app/api/profile/plan/route.ts`
- `app/api/logs/water/route.ts`
- `app/api/logs/mood/route.ts`
- `app/api/logs/caffeine/route.ts`
- `app/api/revenuecat/webhook/route.ts`
- `app/api/sync/ingest/route.ts`
- `app/api/apple-health/sync/route.ts`
- `app/api/health-connect/sync/route.ts`
- `app/api/wearables/sync/route.ts`
- `app/api/account/delete-request/route.ts`
- `app/api/sleep/sessions/[id]/route.ts`
- `app/api/rota/pattern/route.ts`
- `app/api/sleep/social-jetlag-suggestions/route.ts`
- `app/api/sleep/predict-stages/route.ts`
- `app/api/sleep/metrics-suggestions/route.ts`
- `app/api/sleep/predict/route.ts`

## Highest-Risk Remaining Gaps

### 1) Remaining non-zod JSON handlers

The previously tracked final six JSON handlers are now converted.
Remaining validation work should be treated as ongoing hygiene during future route changes and new endpoint additions.

### 2) Service-role-heavy user routes

Still candidates for least-privilege refactor (session client + RLS where possible):
- `app/api/profile/route.ts`
- `app/api/rota/apply/route.ts`
- `app/api/rota/event/route.ts`
- `app/api/sleep/log/route.ts`
- `app/api/revenuecat/webhook/route.ts`
- `app/api/sync/ingest/route.ts`
- `app/api/apple-health/sync/route.ts`
- `app/api/health-connect/sync/route.ts`
- `app/api/wearables/sync/route.ts`

### 3) Production guard consistency

Only three routes have explicit in-route production guard:
- `app/api/wearables/debug/route.ts`
- `app/api/profile/debug/route.ts`
- `app/api/test-openai/route.ts`

Middleware path blocking exists, but route-level guard adoption is not universal.

## Recommended Final Queue (Pre-Release)

1. Standardize error envelope for remaining legacy paths (`ok/success/error` mixes).
2. Reduce service-role in top user paths where RLS-safe alternatives are feasible.
3. Add a CI check: fail if new `req.json` route lacks `parseJsonBody` usage.
4. Add route contract metadata header in all route files:
   - auth mode
   - touched tables
   - service-role usage
   - rate-limit policy

## Overall Assessment

Risk has dropped substantially versus initial baseline:
- Core write/ingest/revenue paths are now mostly schema-validated.
- Previously identified final JSON-validation queue is complete (6/6 converted).
- Build/lint remain green after each hardening tranche.
- Remaining work is now a manageable last-mile set, not broad unknown surface.

