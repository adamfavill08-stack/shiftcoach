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
- Sync writes are idempotent/safe for repeated runs where possible.
- UI reports sync progress and latest successful sync time.

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
- [ ] Subscription status reflects current entitlement state.

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
