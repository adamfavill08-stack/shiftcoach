# ShiftCoach App Behaviour Specification

This document defines expected app behaviour across web and mobile surfaces, including user journeys, data handling, API behaviour, and error handling.

---

## 1. Product Behaviour Summary

ShiftCoach is a shift-work health coaching app that:
- authenticates users and maintains account-scoped data isolation
- captures profile and onboarding details
- builds and applies repeating rota patterns
- computes daily guidance (sleep, hydration, calories, rhythm/recovery)
- syncs wearable and health-provider inputs
- enforces secure API access patterns for account-specific data

Core principle: **all user-visible outputs are personalized to authenticated user context only**.

---

## 2. Platform Behaviour

### 2.1 Supported surfaces
- Web app (Next.js app routes)
- Mobile shell (Capacitor-based)
- Wear companion integration (indirect via sync providers)

### 2.2 Session behaviour
- Unauthenticated users are shown auth entry points (`sign-in`, `sign-up`).
- Authenticated users are routed to onboarding if profile is incomplete.
- Authenticated users with complete profile are routed to dashboard/home flow.

### 2.3 Navigation behaviour
- Bottom-tab style navigation exposes primary destinations (home/calendar/browse/profile).
- Pages preserve user context and restore relevant state where possible.
- Saved rota and sync actions dispatch client refresh events to keep dashboard/calendar in sync.

---

## 3. Authentication & Account Behaviour

### 3.1 Sign-in
- User enters email/password.
- App calls Supabase auth sign-in.
- On success:
  - fetches profile completion fields
  - routes to onboarding if incomplete
  - routes to dashboard if complete
- On failure:
  - maps known auth/network errors to user-friendly messages
  - prevents silent failure

### 3.2 Sign-up
- Creates account and triggers confirmation flow.
- Displays confirmation state and next-step messaging.

### 3.3 Session-required API behaviour
- Protected APIs reject unauthenticated calls with `401`.
- User ID is resolved server-side (never trusted from client payload).
- Queries and writes are scoped to authenticated `user_id`.

### 3.4 Account deletion/compliance behaviour
- User can request deletion through account endpoints.
- Related account data is queued/processed per compliance flow.

### 3.5 Account deletion lifecycle (required)
Account deletion must follow an explicit, auditable lifecycle.

#### 3.5.1 Immediate actions (request accepted)
On successful deletion request creation:
- account is marked `deletion_requested`
- future wearable sync ingestion is disabled for that account
- write operations for coaching/personalization features are blocked or no-op
- user receives confirmation state and expected completion window

#### 3.5.2 Queued actions (background processing)
Deletion worker/process must remove or anonymize account-linked data by table/domain:
- **Profiles/account identity:** delete profile row or hard-anonymize direct identifiers where hard delete is not possible
- **Rota/shift data:** delete user patterns, generated shifts, and related scheduling metadata
- **Sleep/log data:** delete sleep logs/sessions, mood/water/caffeine/activity logs
- **Wearable samples/sync artifacts:** delete ingested wearable samples and provider-linked sync payload records
- **Derived summaries/analytics caches:** delete per-user computed summary rows/materializations
- **Uploaded assets/files:** delete user-owned storage assets (avatars/attachments/exports) and storage references
- **Subscription metadata:** retain only minimal financial/compliance records required by law/platform policy; remove app-level personalization linkage

#### 3.5.3 Retention windows
- **In-app personal health data:** target hard deletion within **30 days** of verified request.
- **Operational logs:** retain only security/audit minimum required by policy, with user identifiers minimized or hashed where possible.
- **Billing/compliance records:** retain only legally required fields for statutory period; must be logically separated from active user profile data.

#### 3.5.4 Post-deletion behaviour
- deleted account cannot resume sync or receive new health data ingestion
- auth sessions for deleted account are revoked/invalidated
- re-signup requires new account lifecycle (no automatic restoration of deleted health history)

#### 3.5.5 Public deletion request abuse controls
Public/request-based deletion endpoints must include abuse-resistant verification:
- verified ownership proof (signed token/email-link challenge or equivalent)
- rate limiting and replay protection
- request idempotency keys to prevent duplicate destructive jobs
- explicit status tracking (`requested`, `verified`, `processing`, `completed`, `rejected`)
- no destructive execution before verification is complete

#### 3.5.6 Deletion evidence and auditability
For each deletion request, system must record:
- request timestamp and verification method
- processing start/completion timestamps
- domain-level deletion outcomes (profile/logs/wearables/files/subscription metadata)
- failure reasons and retry history (if any)

---

## 4. Onboarding Behaviour

### 4.1 Goal
Collect minimum profile needed for personalized guidance.

### 4.2 Data collected
- name
- sex/gender
- date of birth or age
- units preference
- height/weight
- goal (lose/maintain/gain)
- sleep/water target preferences

### 4.3 Validation behaviour
- hard validation ranges for age, anthropometrics, and target ranges
- localized error messages
- no progression when critical fields are invalid

### 4.4 Completion behaviour
- profile is persisted to `profiles`
- user is redirected into dashboard experience

---

## 5. Dashboard & Daily Guidance Behaviour

### 5.1 Dashboard composition
Dashboard surfaces:
- shift context (current/upcoming)
- body clock / rhythm signals
- recovery state
- meal timing and hydration cards
- wearable sync status and last-sync indicators

### 5.2 Behaviour expectations
- Dashboard never shows another user’s data.
- Panels degrade gracefully when data is missing (show placeholders/help text).
- Sync status updates are visible and timestamped.

### 5.3 Daily recomputation behaviour
- Daily/today endpoints aggregate profile + logs + rota context.
- Guidance reflects current shift classification (day/night/off/late/custom where applicable).

---

## 6. Rota & Calendar Behaviour

### 6.1 Pattern selection
- User selects shift length and pattern preset.
- User sets current position in cycle.
- User can preview cycle placement over calendar.

### 6.2 Save flow behaviour
Saving a rota from setup performs two server calls:
1. `POST /api/rota/pattern`  
   Persists pattern metadata (`patternId`, slots, start date, current index, colors/notes).
2. `POST /api/rota/apply`  
   Expands pattern into dated shifts and writes future schedule.

Both calls must succeed for full “pattern applied” confirmation.

### 6.2.1 Transactional failure behaviour (required)
If `POST /api/rota/pattern` succeeds but `POST /api/rota/apply` fails, the required behaviour is:
- persisted pattern is retained as **saved but unapplied** (do not silently discard user setup)
- UI must show explicit partial-state feedback (not generic success/failure only)
- user must be offered an immediate recovery action:
  - primary CTA: **Retry apply**
  - secondary CTA: **Edit pattern settings**
- no false-positive “rota applied” success state may be shown
- calendar remains on last successfully applied shift set until apply succeeds

### 6.2.2 State model requirement
Rota save flow must support these states at minimum:
- `not_saved`
- `saved_not_applied`
- `applied`
- `apply_failed_retryable`

Transitions:
- `not_saved` -> `saved_not_applied` after successful `pattern` call
- `saved_not_applied` -> `applied` after successful `apply` call
- `saved_not_applied` -> `apply_failed_retryable` if `apply` fails
- `apply_failed_retryable` -> `applied` on successful retry

### 6.2.3 API/UX contract for partial success
- On partial success, backend or client orchestration must emit a machine-readable partial status.
- Frontend must map that status to:
  - warning-level message
  - retry action
  - preserved user inputs (no forced re-entry)
- Error details should be logged with route context for debugging and replay.

### 6.3 Apply behaviour
- Pattern slots map to shift labels (`DAY`, `NIGHT`, etc.) and optional timestamps.
- Existing future shifts for user are replaced from generation start forward.
- Off days are persisted with null timestamps.
- Commute metadata may be serialized into shift notes where provided.

### 6.4 No-end-date behaviour
- `endDate` may be null/omitted for indefinite generation behaviour.
- API validation accepts nullable no-end-date payloads.

### 6.5 Isolation behaviour
- Pattern and generated shifts are always filtered by authenticated user.
- Saving on one profile must not appear on other profiles.

---

## 7. Sleep Domain Behaviour

### 7.1 Logging behaviour
- Users can create/update sleep logs and sessions.
- Daily and rolling views compute trend signals from recent sleep.

### 7.2 Insights behaviour
- Sleep endpoints produce:
  - today metrics
  - 7-day context
  - suggestions (social jetlag, metrics advice)
  - prediction helpers where enabled

### 7.3 Failure handling
- Missing data returns safe defaults and “not enough data” states.
- Endpoint failures should not crash full dashboard render.

---

## 8. Nutrition, Hydration, Activity & Coaching Behaviour

### 8.1 Nutrition/hydration behaviour
- Daily targets are derived from profile and shift context.
- Today summaries combine goals + logs + timing behaviour.

### 8.2 Activity behaviour
- Steps/activity logs are accepted and merged into daily calculations.
- Activity panels show user’s own data only.

### 8.3 Coach behaviour
- Coaching endpoint generates guidance from user profile + current context.
- Tone/settings can be influenced by stored user preferences.

---

## 9. Wearables & Sync Behaviour

### 9.1 Provider model
- App uses provider-first sync model (Apple Health / Health Connect paths).
- Google Fit direct dependency is deprecated/decommission path.

### 9.2 Sync behaviour
- Manual or scheduled sync endpoints ingest health data.
- Sync writes must be idempotent for repeated runs (no duplicate record creation on replay).
- UI reports sync progress and latest successful sync time.

### 9.2.1 Idempotency and deduplication contract (required)
For sleep/activity/heart-rate (and similar sample-based streams):
- ingestion keys must include provider/source identity + sample identity or deterministic time-window identity
- repeated sync of the same upstream payload must not create duplicates
- dedupe must be deterministic across:
  - same sample replayed in later sync windows
  - overlapping sync windows
  - provider retry/retransmit behaviour

Minimum uniqueness strategy per sample:
- provider (`apple_health` / `health_connect`)
- external sample ID when available
- metric type (sleep/activity/heart_rate/etc.)
- start/end timestamps (normalized)
- user/account scope

### 9.2.2 Deterministic upsert/update rules
When incoming sample matches existing identity key:
- apply deterministic merge policy (not append)
- newer provider revision/version wins when revision metadata exists
- if no revision metadata exists, prefer latest ingestion timestamp with stable tie-breaker
- updates must be idempotent under repeated processing of same batch

### 9.2.3 Windowing and replay safety
- sync jobs may overlap time windows; overlap must not inflate totals or duplicate samples
- backfills and historical re-sync must preserve one canonical sample per identity key
- aggregate recalculations must derive from deduped canonical samples only

### 9.2.4 Failure/retry behaviour for sync jobs
- failed sync batches can be retried safely without manual cleanup
- partial-batch success must not corrupt idempotency guarantees
- retry logic must not alter final canonical dataset compared to single successful run

### 9.3 Error behaviour
- Provider auth or token issues show clear, actionable status.
- Sync failure does not break unrelated app sections.

---

## 10. Subscriptions & Entitlement Behaviour

### 10.1 Revenue model behaviour
- Subscription state is handled via RevenueCat-integrated flows.
- Profile stores subscription platform/status metadata.

### 10.2 Cancellation/status behaviour
- Cancel endpoints update subscription state appropriately.
- Webhook/event handling keeps server-side status synchronized.

### 10.3 Access behaviour
- Premium/plan-based features should gate by current entitlement state.

### 10.4 Entitlement source-of-truth and conflict policy (required)
- **Primary truth:** server-validated entitlement state (RevenueCat-backed status resolved via backend).
- **Secondary fallback:** last-known-good local/cache entitlement with TTL.
- If cache and server disagree, **server state wins** once reachable.
- Cache must be marked with timestamp and confidence (`fresh`, `stale`, `unverified`).

### 10.5 RevenueCat/API unavailability behaviour
When RevenueCat (or entitlement verification path) is temporarily unavailable:
- app must not silently hard-fail the subscription UI
- use last-known-good entitlement for a short fallback window (e.g., up to 24h) with `degraded verification` status
- show clear user-facing state:  
  - "We can’t confirm subscription right now. Your access is temporarily preserved while we retry."
- schedule background retries with backoff
- if verification remains unavailable past fallback window, move to restricted/limited state with explicit explanation and retry action

### 10.6 Grace period and billing issue behaviour
- If provider reports billing grace period / account hold:
  - premium access remains enabled during active grace window
  - app shows billing-warning banner with manage-subscription CTA
- If grace window expires without recovery:
  - entitlement transitions to inactive
  - premium gating applies immediately after confirmed expiration

### 10.7 Downgrade and cancellation timing
- **User-initiated cancellation:** premium access remains until end of paid period unless provider marks immediate termination.
- **Plan downgrade:** new lower tier takes effect at renewal boundary unless provider explicitly reports immediate tier change.
- **Immediate revocation events** (refund/revoke/fraud/admin revoke): apply immediately on confirmed webhook/server state.
- UI must show effective date ("Active until <date>" or "Downgrade effective on renewal").

### 10.8 Unconfirmed status UX contract
When status cannot be confidently confirmed:
- display explicit verification state badge (`verified`, `retrying`, `stale`, `unverified`)
- avoid misleading "active" hard labels when state is unverified
- provide user action:
  - retry check
  - open manage subscription
  - contact support if persistent

### 10.9 Webhook and reconciliation behaviour
- Webhooks update server-side subscription status as soon as events arrive.
- Client-side status checks reconcile with backend snapshot on app foreground and key paywall actions.
- Reconciliation conflicts are logged and resolved to latest provider-confirmed server state.

---

## 11. API Behaviour Contract

### 11.1 Request validation
- JSON request bodies are schema-validated (Zod-based).
- Invalid payloads return `400` with explicit reason keys.

### 11.2 Error model
- `401` for auth-required routes without valid user context.
- `400` for validation or malformed request state.
- `500` for unexpected server/database faults.

### 11.3 Response expectations
- Success responses include explicit success flags and key data payloads.
- Server logs include route-scoped context for debugging.

### 11.4 Security behaviour
- No client-provided `user_id` trust.
- Server resolves authenticated user and applies row-level filters.
- Sensitive routes are not publicly exposed in production.

### 11.5 Standard response envelope (required)
All JSON API responses must use a consistent top-level envelope.

#### Success envelope
```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "string",
    "timestamp": "ISO-8601 string"
  }
}
```

Rules:
- `success` is always present and boolean.
- `data` is always present on success (object/array/scalar as route contract defines).
- `meta.requestId` should be included where request tracing is available.
- `meta.timestamp` must be UTC ISO-8601 string.

#### Error envelope
```json
{
  "success": false,
  "error": {
    "code": "machine_readable_code",
    "message": "human readable summary",
    "details": []
  },
  "meta": {
    "requestId": "string",
    "timestamp": "ISO-8601 string"
  }
}
```

Rules:
- `error.code` is stable and machine-parseable (snake_case).
- `error.message` is safe for user-facing display fallback.
- `error.details` is optional but, if present, must be an array with deterministic shape.

### 11.6 Validation error detail contract
For request validation failures (`400`):
- include field-level details where possible:
  - `field` (JSON path)
  - `issue` (machine-readable validator reason)
  - `message` (human-readable text)
- multiple violations should be returned together where available.

Example:
```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "field": "startDate", "issue": "invalid_format", "message": "Expected ISO date" },
      { "field": "startCycleIndex", "issue": "min", "message": "Must be >= 0" }
    ]
  }
}
```

### 11.7 Data typing and serialization invariants
- Timestamps are always UTC ISO-8601 strings in API responses.
- Date-only fields use `YYYY-MM-DD` ISO date string.
- Internal API numeric payloads are metric-normalized unless a route explicitly documents alternate units.
- Optional known fields should return explicit `null` when empty (avoid unpredictable omit vs null behavior).
- Booleans and numbers are never serialized as strings.

### 11.8 Field naming conventions
- JSON field names use `camelCase` consistently.
- Stable contract fields (`success`, `data`, `error`, `meta`, `code`, `message`, `details`) must not vary by route.
- New fields are additive and backward-compatible; removals/renames require versioning or migration notice.

### 11.9 Compatibility and mobile safety rules
- Do not silently change response shapes on existing endpoints.
- Unknown extra fields must be non-breaking for clients.
- Client-critical enums should be documented and only expanded in backward-compatible ways.
- Contract-breaking changes require coordinated mobile/web release planning.

---

## 12. UX & Content Behaviour

### 12.1 Localization behaviour
- UI copy keys are language-provider driven.
- Sign-in heading copy is now `Welcome` (English key: `auth.signIn.title`).

### 12.2 Empty/loading states
- Every major page should provide:
  - loading state
  - empty/no-data state
  - recoverable error state

### 12.3 Accessibility behaviour
- Inputs, actions, and key controls should remain keyboard-operable.
- Status changes (sync/save/errors) should be clearly visible.

---

## 13. Data Integrity & Privacy Behaviour

### 13.1 Data scoping
- All personal data is account-scoped by `user_id`.
- Cross-account data leakage is treated as a critical defect.

### 13.2 Write behaviour
- Save operations should be atomic per endpoint intent.
- Partial-failure routes should either:
  - return explicit partial status, or
  - fail with clear error.

### 13.3 Auditability behaviour
- Important write paths log enough server context to trace failures.

---

## 14. Known Behavioural Risks to Watch

- Large rota generation windows can create heavy insert workloads.
- Provider sync reliability depends on external auth/token state.
- AI/coaching output quality depends on upstream profile/log completeness.
- Legacy paths may still exist but should not bypass hardened API guards.

---

## 15. Behavioural Acceptance Checklist (Release Ready)

- [ ] Sign-in routes correctly by profile completeness.
- [ ] Onboarding validations enforce allowed ranges.
- [ ] Rota save + apply completes with no-end-date flow.
- [ ] Saved rota appears only for originating user profile.
- [ ] If apply fails after pattern save, user sees explicit `saved_not_applied` state with retry CTA.
- [ ] Dashboard loads with valid placeholders on missing data.
- [ ] Protected APIs return `401` when session is absent.
- [ ] Sync errors are surfaced without app-wide breakage.
- [ ] Repeated health sync replays do not create duplicate sleep/activity/heart-rate records.
- [ ] Overlapping sync windows preserve deterministic canonical samples and stable aggregates.
- [ ] API success/error envelopes conform to the standard response contract.
- [ ] Validation errors include field-level details for core endpoints where applicable.
- [ ] Timestamp/date/nullability/unit serialization invariants are verified for core endpoints.
- [ ] Subscription status reflects current entitlement state.
- [ ] Subscription fallback policy is enforced when verification providers are unavailable.
- [ ] Cache/server entitlement conflicts resolve to server truth with explicit user-visible state.
- [ ] Grace-period and downgrade timing rules match provider-reported lifecycle.
- [ ] Deletion request lifecycle is enforced with verification, status transitions, and completion evidence.
- [ ] Post-deletion account cannot ingest new wearable sync data.
- [ ] Domain-level deletion coverage (profiles, logs, wearable samples, summaries, assets, subscription metadata handling) is validated.

---

## 16. Isolation Verification Matrix (Required)

The following tests are required before release to verify account-scoped isolation in practice.

### 16.1 Rota isolation tests
- **A creates rota, B cannot see it**  
  - User A saves pattern and applies rota.  
  - User B opens calendar/rota endpoints.  
  - Expectation: B never receives A’s pattern rows or generated shifts.
- **A shift ID cannot be fetched by B**  
  - Capture shift/log identifiers from A.  
  - Attempt B-side fetch/update/delete using those IDs.  
  - Expectation: `404` or empty result, never data disclosure.

### 16.2 Sleep/log isolation tests
- **A logs sleep, B cannot read/update/delete it**  
  - Create sleep records as A; attempt direct ID access as B.  
  - Expectation: caller-scoped data only, no cross-account visibility.
- **Per-user summaries are caller-bound**  
  - Compare A and B responses for today/overview/7-day endpoints.  
  - Expectation: each response only reflects caller-owned records.

### 16.3 Export/deletion boundary tests
- **Data export contains only caller data**  
  - Run export as A and B on populated environments.  
  - Expectation: each export bundle includes only that account’s rows.
- **Deletion affects only caller-owned data**  
  - Execute user deletion/request flows as A.  
  - Expectation: A-owned records are targeted; B remains unchanged.
- **Admin/system pathways are explicit and segregated**  
  - Verify elevated cleanup tasks are not reachable via standard user routes.

### 16.4 API auth guard tests
- **No-session access is rejected**  
  - Call protected routes without valid session.  
  - Expectation: `401` consistently.
- **Client-supplied foreign user_id is ignored/rejected**  
  - Inject another user’s ID in request payload/query where possible.  
  - Expectation: server resolves identity from auth context only.

### 16.5 Release gate requirement
- Isolation test evidence (logs/screenshots/test output) must be attached to release sign-off.
- Any cross-account leakage is a **P0 release blocker**.

### 16.6 Execution cadence and ownership
- **Per PR (minimum):**
  - Run at least one A/B cross-account isolation scenario touching changed domains.
  - Re-run no-session auth-guard checks for any modified protected endpoints.
- **Pre-release candidate (mandatory full sweep):**
  - Execute all tests in sections 16.1 to 16.4.
  - Record pass/fail and evidence links for each test case.
- **Ownership:**
  - Feature engineer executes per-PR minimum checks.
  - QA/release owner executes or validates full pre-release sweep.

### 16.7 Evidence format (required fields)
Each isolation test record must include:
- test ID and domain (rota/sleep/export/delete/auth)
- actor identities (`User A`, `User B`, unauthenticated)
- endpoint/page under test
- request summary (method, payload shape, key params)
- expected result
- actual result (status code and response summary)
- evidence reference (screenshot, console log, or test output)

---

## 17. Ownership & Update Rule

This file is the behaviour baseline for QA, product sign-off, and regression checks.

When behaviour changes in any domain (auth, rota, sync, subscription, coaching, dashboard), update this file in the same PR to keep implementation and expected behaviour aligned.
