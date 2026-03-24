# ShiftCoach App Behaviour Specification

This file defines required runtime behaviour for ShiftCoach across web/mobile surfaces.
It is a release contract, not a design note.

---

## 1) Scope And Principles

### 1.1 In scope
- Auth/account lifecycle
- Onboarding/profile data collection
- Rota save/apply flows
- Dashboard and guidance rendering
- Wearable/health sync ingestion
- Subscription/entitlement enforcement
- Data export/deletion compliance
- Security and accessibility behaviour
- API response contracts
- Offline/poor-network handling

### 1.2 Core principles
- **Account isolation first:** all user-visible data is caller-scoped.
- **Determinism:** repeated operations produce stable results.
- **No silent failure:** partial or degraded states must be explicit.
- **Backward-safe APIs:** contracts are stable and additive.

---

## 2) Platform Behaviour

### 2.1 Surfaces
- Web (Next.js)
- Mobile shell (Capacitor)
- Provider-linked wearable ingestion paths

### 2.2 Session flow
- Unauthenticated users are routed to auth entry points.
- Authenticated users:
  - incomplete profile -> onboarding
  - complete profile -> dashboard

### 2.3 Navigation expectations
- Primary routes remain reachable via app navigation shell.
- Save/sync actions trigger refresh events where needed.

---

## 3) Authentication And Account

### 3.1 Sign-in
- Must validate credentials server-side via Supabase auth.
- Must present user-safe error messages for invalid credentials and network faults.
- Must not silently fail.

### 3.2 Sign-up
- Must create account and trigger confirmation flow.
- Must provide explicit next-step messaging.

### 3.3 Protected route behaviour
- Auth-required API routes must return `401` with the standard error envelope when caller authentication is absent, invalid, or expired.
- Server resolves caller identity; client-provided `user_id` is ignored/rejected.

---

## 4) Onboarding And Profile

### 4.1 Required collection
- Name, sex/gender, age/DOB
- Units preference
- Height/weight
- Goal and key baseline targets

### 4.2 Validation
- Enforced ranges for age/body metrics/targets.
- Field-level validation feedback in UI and API where relevant.

---

## 5) Dashboard And Guidance

### 5.1 Rendering
- Dashboard should render even when partial data is unavailable.
- Missing-data states must be explicit (not blank or broken).

### 5.2 Data freshness
- Online: fetch current data with short revalidation windows.
- Offline: show last-known cached guidance where available, with explicit stale messaging.

---

## 6) Rota Behaviour

### 6.1 Save flow contract
Rota setup executes:
1. `POST /api/rota/pattern`
2. `POST /api/rota/apply`

Both succeed -> **applied** state.

### 6.2 Transactional failure handling (required)
If pattern save succeeds and apply fails:
- Persist pattern as **saved_not_applied**
- Do not show success as applied
- Show explicit warning state
- Provide recovery CTA: **Retry apply**
- Keep user inputs for retry (no forced re-entry)
- Keep calendar on last successfully applied state

### 6.3 Minimum state model
- `not_saved`
- `saved_not_applied`
- `apply_failed_retryable`
- `applied`

---

## 7) Health Sync And Idempotency

### 7.1 Provider model
- Apple Health and Health Connect are primary ingestion paths.

### 7.2 Idempotency contract (required)
Repeated sync must not duplicate canonical records.

Sleep/activity/heart-rate ingestion must dedupe by:
- user/account scope
- provider/source
- metric type
- sample identity and/or deterministic timestamp window identity
- where provider-native sample identity exists, it takes precedence over timestamp-window identity

### 7.3 Deterministic update rules
- Upsert/merge, not append, when identity matches.
- If provider revision exists, newest revision wins.
- If not, latest ingestion timestamp wins with stable tie-break.

### 7.4 Replay/window safety
- Overlapping windows must not inflate aggregates.
- Retrying failed batches must converge to same final canonical dataset.

---

## 8) Subscription And Entitlements

### 8.1 Source of truth
- Primary: backend/provider-verified entitlement.
- Secondary fallback: last-known-good cached entitlement (time-bounded).
- On conflict, server truth wins when reachable.

### 8.2 Provider outage behaviour
- If verification is temporarily unavailable:
  - keep explicit degraded verification state
  - preserve access only within configured fallback window
  - show clear message and retry action

### 8.3 Grace/cancel/downgrade timing
- Grace period active -> maintain access with billing warning.
- Cancel/downgrade default at renewal boundary unless provider reports immediate change.
- Immediate revoke/refund events apply immediately when confirmed.

### 8.4 Unconfirmed state UX
- Must display verification state (`verified`, `retrying`, `stale`, `unverified`).
- Must not present uncertain state as hard-confirmed active.

---

## 9) Account Deletion And Compliance

### 9.1 Immediate request handling
On accepted deletion request:
- mark account `deletion_requested` (or equivalent)
- disable future sync ingestion for that account
- return expected processing window

### 9.2 Processing scope (queued/worker)
Deletion/anonymization must cover:
- profile and direct identifiers
- rota and shifts
- sleep and health logs
- wearable samples/sync artifacts
- derived summaries/caches
- user-owned assets/files
- app-level subscription linkage (keep only legally required billing records)

### 9.3 Retention windows
- Personal health/application data: target deletion within 30 days after verified request.
- Operational/security logs: minimal retention with identifier minimization.
- Statutory billing records: retain legal minimum only.

### 9.4 Abuse prevention (public deletion route)
- ownership verification challenge required
- IP + identity rate limiting
- idempotent request handling
- explicit status workflow (`requested`, `verified`, `processing`, `completed`, `rejected`)

### 9.5 Post-deletion behaviour
- No new sync ingestion for deleted account.
- Sessions invalidated/revoked.
- Re-signup does not silently restore deleted health history.

---

## 10) API Contract

### 10.1 Success envelope (standard)
```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "string",
    "timestamp": "ISO-8601 UTC"
  }
}
```

### 10.2 Error envelope (standard)
```json
{
  "success": false,
  "error": {
    "code": "snake_case_code",
    "message": "human readable message",
    "details": []
  },
  "meta": {
    "requestId": "string",
    "timestamp": "ISO-8601 UTC"
  }
}
```

### 10.3 Validation error details
For `400 validation_error`, include field-level entries:
- `field`
- `issue`
- `message`

### 10.4 Serialization invariants
- Timestamps: UTC ISO-8601 strings
- Date-only: `YYYY-MM-DD`
- Numbers/booleans not stringified
- Optional documented fields should use explicit `null` rather than inconsistent omit/null behavior within the same endpoint family
- Internal numeric units metric-normalized unless explicitly documented otherwise

### 10.5 Compatibility rules
- No silent response shape breaks.
- Additive changes only unless versioned migration is coordinated.

---

## 11) Security Behaviour Requirements

### 11.1 Dangerous route controls
- Rate limiting or equivalent abuse controls on auth-sensitive, export, deletion-request, sync-ingest, and AI-costly endpoints.
- CSRF origin protections for cookie-session state-changing routes.
- Webhook signature verification for external event sources.
- Export endpoint audit logging (who/when/format/source context).

### 11.2 Logging policy
- Security-sensitive actions log route-scoped context without exposing secrets.

---

## 12) Offline And Poor-Network Behaviour

### 12.1 Write actions
- Network-required writes (sign-in, rota apply, sync triggers) fail fast offline with clear message.
- UI must preserve in-progress local form state where practical.

### 12.2 Dashboard/read behaviour
- If offline, show last-known cached guidance/data if available.
- Clearly mark stale/cached state.

### 12.3 Retry strategy
- Provide explicit retry controls after recoverable network failure.
- Retries should be safe and deterministic.

---

## 13) Accessibility Behaviour

### 13.1 Required baseline
- Keyboard-operable core flows.
- Programmatic labels for form controls.
- Accessible names for icon-only controls.
- Status not conveyed by color alone.
- Async status/error announcements via assistive-tech-friendly regions where applicable.
- Visible focus states.
- Mobile touch targets ~44x44 CSS px minimum for primary actions.

### 13.2 Verification
- Keyboard-only pass for sign-in/onboarding/rota save.
- Screen-reader sanity pass for labels/names/status announcements.

---

## 14) Release Acceptance Checklist

- [ ] Auth routing by profile completeness is correct.
- [ ] Protected routes return `401` without valid caller context.
- [ ] Rota save/apply succeeds end-to-end for valid inputs.
- [ ] `saved_not_applied` partial state is shown with retry CTA when apply fails.
- [ ] Cross-account isolation checks pass for rota/log/read-by-id paths.
- [ ] Health sync replay does not create duplicate canonical records.
- [ ] Overlapping sync windows keep aggregates stable.
- [ ] Subscription fallback/conflict/grace/downgrade behaviour matches contract.
- [ ] Deletion request workflow enforces verification/rate limit/idempotency.
- [ ] Post-deletion account cannot ingest new sync data.
- [ ] API envelopes and validation detail shapes match standard.
- [ ] Timestamp/date/nullability/unit invariants pass endpoint checks.
- [ ] Accessibility baseline checks pass on core mobile flows.
- [ ] Offline behaviour is explicit (write fail-fast + stale cached guidance UI).

---

## 15) Ownership And Change Rule

This file is a release contract for engineering, QA, and product.

Any behavioural change touching auth, rota, sync, subscriptions, deletion, security, API contracts, accessibility, or offline handling must update this file in the same PR.

