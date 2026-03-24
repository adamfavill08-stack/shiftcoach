# Route Audit - 2026-03-21

Scope: `app/api/**/route.ts`

## Executive Summary

- Total route files: 93
- Routes using centralized session-auth helper (`getServerSupabaseAndUserId` / `requireServerUser` / `buildUnauthorizedResponse`): 76
- Routes not using the session-auth helper: 17 (mostly public/system/webhook/deprecated)
- Routes parsing JSON body (`req.json()`): 27
- Routes with no strong schema validation (`zod`/`safeParse` not used): broad gap across JSON routes
- Explicit production route guards (`NODE_ENV === 'production'`): 3
- Rate limiting present in only a few routes (coach/suggestion paths), not standardized

## Findings (Severity Ordered)

### 1) High - Service-role usage in user-facing paths increases blast radius

Multiple session-authenticated routes still write/read with service-role clients after identifying the user, rather than relying on session client + RLS. This can bypass RLS protections if route logic regresses.

Examples:
- `app/api/apple-health/sync/route.ts`
- `app/api/health-connect/sync/route.ts`
- `app/api/wearables/sync/route.ts`
- `app/api/summary/week/route.ts`
- `app/api/today/route.ts`

Risk:
- Accidental cross-user data access if filters are missed
- Harder to prove least-privilege data access

### 2) High - Input validation is mostly ad-hoc and not schema-based

No route in `app/api/**` currently uses a schema validator (`zod`/`safeParse`) as a standard. Most JSON handlers rely on manual `typeof` checks or partial checks.

Higher-risk JSON handlers:
- `app/api/sync/ingest/route.ts`
- `app/api/health-connect/sync/route.ts`
- `app/api/apple-health/sync/route.ts`
- `app/api/revenuecat/webhook/route.ts`
- `app/api/account/delete-request/route.ts`

Risk:
- Malformed payloads reaching DB logic
- Inconsistent 400 behavior and error shapes
- Type drift between frontend and backend contracts

### 3) High - Error response format is inconsistent across route surface

Current patterns include:
- `{ error: '...' }`
- `{ ok: false, error: '...' }`
- `{ lastSyncedAt: null, error: 'unexpected' }`
- success payloads with different keys (`ok`, `success`, domain-specific)

Examples:
- `app/api/account/delete/route.ts` uses raw `Response` and `ok/error`
- `app/api/sync/ingest/route.ts` uses `{ error: '...' }`
- `app/api/wearables/sync/route.ts` mixes domain payload with error key

Risk:
- Clients need endpoint-specific error parsing
- Monitoring and alerting normalization is harder

### 4) Medium - Rate limiting is not standardized

Only a subset of AI-heavy routes appears to use rate limiting patterns; most routes have none.

Detected rate-limit references:
- `app/api/coach/route.ts`
- `app/api/coach/tip/route.ts`
- `app/api/sleep/metrics-suggestions/route.ts`
- `app/api/sleep/social-jetlag-suggestions/route.ts`

Risk:
- Abuse/spike risk on write-heavy and compute-heavy endpoints
- Uneven production behavior under load

### 5) Medium - Logging/redaction policy not centralized

Many routes use direct `console.error/warn/log` with arbitrary payloads. Some log rich error objects and stack traces.

Examples:
- `app/api/apple-health/sync/route.ts`
- `app/api/wearables/sync/route.ts`
- `app/api/revenuecat/webhook/route.ts`

Risk:
- Potential leakage of sensitive context in logs
- Inconsistent observability quality

### 6) Medium - Public/system route inventory needs explicit contract labeling

Routes intentionally not session-gated are valid, but should be explicitly labeled and versioned as such:
- webhooks: `app/api/revenuecat/webhook/route.ts`
- cron/system: `app/api/cron/precompute-daily-scores/route.ts`, `app/api/daily-metrics/compute/route.ts`, `app/api/subscription/process-deletions/route.ts`, `app/api/profile/update-ages/route.ts`
- public: `app/api/blog/route.ts`, `app/api/sleep/predict/route.ts`, deprecated `app/api/google-fit/*`

Risk:
- Future edits accidentally weaken auth assumptions

## Recommended Remediation Plan (Pre-Release)

### Phase 1 - Mandatory baseline (fast, highest ROI)

1. Introduce shared API response helpers in `lib/api/response.ts`:
   - `ok(data)`
   - `badRequest(code, message, details?)`
   - `unauthorized()`
   - `internalError(code)`

2. Introduce shared validation helpers in `lib/api/validation.ts` with `zod`:
   - one schema per JSON route payload
   - standardized 400 response on parse failure

3. Introduce shared auth wrappers in `lib/api/auth.ts`:
   - `withSessionUser(handler)`
   - `withBearerToken(handler)` for machine-to-machine routes
   - `withCronSecret(handler)`

4. Add a minimal route metadata header comment template to each route:
   - auth mode
   - touched tables
   - service-role usage (`yes/no`)
   - rate-limit policy

### Phase 2 - Service-role reduction pass

Prioritize converting these to session client + RLS where feasible:
- `app/api/apple-health/sync/route.ts`
- `app/api/health-connect/sync/route.ts`
- `app/api/wearables/sync/route.ts`
- `app/api/today/route.ts`
- `app/api/summary/week/route.ts`

### Phase 3 - Hardening + CI guardrails

1. Add route contract checks in CI:
   - fail if new JSON route has no schema
   - fail if new session route bypasses auth helper

2. Add route smoke tests for:
   - auth expected status (401/200)
   - malformed payload (400)
   - standard error shape

3. Add centralized log helper with redaction (tokens, auth headers, PII-like fields).

## Release Gate Recommendation

Before release, block on:
- Schema validation for all 27 JSON body routes
- Standardized error shape helpers adopted in top 20 critical routes
- Service-role reduction in wearable ingestion + today/summary critical paths
- Explicit auth contract labels for all 93 routes

