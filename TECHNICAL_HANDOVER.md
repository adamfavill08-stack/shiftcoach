# ShiftCoach Technical Handover

Last updated: 2026-03-21  
Repo root: `c:/dev/shiftcoach`

---

## 1) App Overview

ShiftCoach is a Next.js 16 App Router application with:
- Web app UI and APIs under `app/`
- Feature/domain logic in `lib/`
- Shared UI and feature components in `components/`
- Supabase-backed data/auth with SQL migrations in `supabase/migrations/`
- Capacitor Android/iOS shells in `android/` and `ios/`
- Wear OS companion module in `android/wear/`

Core runtime entry points:
- Web root layout: `app/layout.tsx`
- Dashboard route: `app/(dashboard)/dashboard/page.tsx`
- Main API surface: `app/api/**/route.ts`
- Capacitor config: `capacitor.config.ts`
- Next config: `next.config.ts`

---

## 2) Product Purpose

ShiftCoach is a shift-worker health and planning product that combines:
- Sleep tracking and insight generation (`app/(app)/sleep/*`, `app/api/sleep/*`)
- Shift/rota planning and rhythm alignment (`app/(app)/rota/*`, `app/api/rota/*`, `app/api/shift-rhythm/route.ts`)
- Circadian and recovery coaching (`app/api/circadian/calculate/route.ts`, `app/api/coach/*`)
- Activity/nutrition/hydration behavior guidance (`app/api/activity/*`, `app/api/nutrition/today/route.ts`, `app/api/meal-timing/today/route.ts`)
- Wearable + mobile sync (Health Connect, Apple Health, Wear OS ping/ack bridge)

---

## 3) Folder Tree (Operationally Complete)

This is the complete structural view you typically need for maintenance/handover.  
(Generated from repo contents, grouped for readability.)

```text
c:/dev/shiftcoach
├─ app/
│  ├─ (dashboard)/
│  │  └─ dashboard/page.tsx
│  ├─ (app)/
│  │  ├─ activity/page.tsx
│  │  ├─ activity/log/page.tsx
│  │  ├─ adjusted-calories/page.tsx
│  │  ├─ binge-risk/page.tsx
│  │  ├─ body-clock/page.tsx
│  │  ├─ calendar/day/page.tsx
│  │  ├─ calendar/list/page.tsx
│  │  ├─ calendar/week/page.tsx
│  │  ├─ calendar/year/page.tsx
│  │  ├─ coach/page.tsx
│  │  ├─ heart-health/page.tsx
│  │  ├─ hydration/page.tsx
│  │  ├─ profile/page.tsx
│  │  ├─ progress/page.tsx
│  │  ├─ recovery/page.tsx
│  │  ├─ rota/page.tsx
│  │  ├─ rota/new/page.tsx
│  │  ├─ rota/event/page.tsx
│  │  ├─ rota/setup/page.tsx
│  │  ├─ rota/pattern/page.tsx
│  │  ├─ rota/upload/page.tsx
│  │  ├─ rota/bulk/page.tsx
│  │  ├─ rota/sheet.tsx
│  │  ├─ settings/page.tsx
│  │  ├─ settings/components/*.tsx
│  │  ├─ shift-rhythm/page.tsx
│  │  ├─ shift-worker-diet/page.tsx
│  │  ├─ shift-worker-goals/page.tsx
│  │  ├─ shift-worker-health/page.tsx
│  │  ├─ sleep/page.tsx
│  │  ├─ sleep/overview/page.tsx
│  │  ├─ sleep/logs/page.tsx
│  │  ├─ sleep/history/page.tsx
│  │  ├─ steps/page.tsx
│  │  ├─ verify-onboarding/page.tsx
│  │  ├─ wearables-debug/page.tsx
│  │  ├─ wearables-setup/page.tsx
│  │  └─ welcome/page.tsx
│  ├─ auth/
│  │  ├─ sign-in/page.tsx
│  │  ├─ sign-up/page.tsx
│  │  ├─ reset/page.tsx
│  │  ├─ update-password/page.tsx
│  │  └─ callback/route.ts
│  ├─ account/delete/page.tsx
│  ├─ onboarding/page.tsx
│  ├─ splash/page.tsx
│  ├─ blog/page.tsx
│  ├─ blog/[slug]/page.tsx
│  ├─ health-data-notice/page.tsx
│  ├─ privacy-policy/page.tsx
│  ├─ terms-of-service/page.tsx
│  ├─ shift-lag/page.tsx
│  ├─ test/page.tsx
│  ├─ api/**/route.ts (92 endpoints)
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ globals.css
│  └─ error.tsx
├─ components/
│  ├─ dashboard/**/*.tsx
│  ├─ sleep/**/*.tsx
│  ├─ calendar/**/*.tsx
│  ├─ rota/**/*.tsx
│  ├─ settings/**/*.tsx
│  ├─ wearables/**/*.tsx
│  ├─ providers/**/*.tsx
│  ├─ ui/**/*.tsx
│  ├─ blog/**/*.tsx
│  ├─ layout/**/*.tsx
│  ├─ notifications/**/*.tsx
│  ├─ coach/**/*.tsx
│  ├─ modals/**/*.tsx
│  ├─ shift-rhythm/**/*.tsx
│  ├─ shiftlag/**/*.tsx
│  ├─ quick-add/**/*.tsx
│  └─ root components (*.tsx)
├─ lib/
│  ├─ supabase*.ts
│  ├─ hooks/**/*.ts
│  ├─ sleep/**/*.ts
│  ├─ circadian/**/*.ts
│  ├─ rota/**/*.ts
│  ├─ nutrition/**/*.ts
│  ├─ activity/**/*.ts
│  ├─ data/**/*.ts
│  ├─ notifications/**/*.ts
│  └─ helpers/calendar/**/*.ts
├─ supabase/
│  └─ migrations/*.sql (43 files)
├─ android/
│  ├─ app/ (Capacitor phone shell + Wear bridge)
│  ├─ wear/ (Wear OS app module)
│  └─ shared-kotlin/
├─ ios/
├─ docs/
├─ public/
├─ vendor/
├─ package.json
├─ next.config.ts
├─ capacitor.config.ts
└─ eslint.config.mjs
```

---

## 4) Page-by-Page Breakdown

### Core shell and global behavior
- `app/layout.tsx`: global providers, app shell wiring (auth/provider wrappers, bottom nav patterns, wearable auto-sync hooks).
- `app/page.tsx`: root entry page behavior/redirect UI.
- `app/(dashboard)/dashboard/page.tsx`: main dashboard composition and data orchestration.

### Auth and account
- `app/auth/sign-in/page.tsx`: email/password sign-in flow.
- `app/auth/sign-up/page.tsx`: registration.
- `app/auth/reset/page.tsx`: reset initiation.
- `app/auth/update-password/page.tsx`: password update.
- `app/auth/callback/route.ts`: OAuth/email callback code exchange.
- `app/account/delete/page.tsx`: account deletion UX.

### Onboarding and setup
- `app/onboarding/page.tsx`: initial profile/setup.
- `app/(app)/verify-onboarding/page.tsx`: setup verification checks.
- `app/(app)/welcome/page.tsx`: in-app welcome/first-run.
- `app/(app)/wearables-setup/page.tsx`: wearable onboarding and status.
- `app/(app)/wearables-debug/page.tsx`: wearable diagnostics UI.

### Sleep domain
- `app/(app)/sleep/page.tsx`: sleep hub.
- `app/(app)/sleep/overview/page.tsx`: detailed summary.
- `app/(app)/sleep/logs/page.tsx`: logs list.
- `app/(app)/sleep/history/page.tsx`: historical trends.

### Calendar/rota domain
- `app/(app)/calendar/day/page.tsx`, `week/page.tsx`, `list/page.tsx`, `year/page.tsx`: calendar views.
- `app/(app)/rota/page.tsx`: rota landing.
- `app/(app)/rota/new/page.tsx`: create shift.
- `app/(app)/rota/event/page.tsx`: event edit/details.
- `app/(app)/rota/setup/page.tsx`: setup wizard.
- `app/(app)/rota/pattern/page.tsx`: recurring pattern.
- `app/(app)/rota/upload/page.tsx`: import/upload.
- `app/(app)/rota/bulk/page.tsx`: batch operations.

### Health/coach/activity pages
- `app/(app)/activity/page.tsx`, `activity/log/page.tsx`
- `app/(app)/adjusted-calories/page.tsx`
- `app/(app)/binge-risk/page.tsx`
- `app/(app)/body-clock/page.tsx`
- `app/(app)/heart-health/page.tsx`
- `app/(app)/hydration/page.tsx`
- `app/(app)/recovery/page.tsx`
- `app/(app)/shift-rhythm/page.tsx`
- `app/(app)/steps/page.tsx`
- `app/(app)/coach/page.tsx`
- `app/(app)/progress/page.tsx`

### Profile/settings
- `app/(app)/profile/page.tsx`
- `app/(app)/settings/page.tsx` plus section components in `app/(app)/settings/components/*.tsx`

### Marketing/legal/supporting routes
- `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`
- `app/privacy-policy/page.tsx`
- `app/terms-of-service/page.tsx`
- `app/health-data-notice/page.tsx`
- `app/splash/page.tsx`
- `app/shift-lag/page.tsx`
- `app/test/page.tsx`

---

## 5) Component-by-Component Breakdown (Grouped)

### Dashboard composition (`components/dashboard/`)
Primary dashboard renderer and cards.
- Container/orchestration: `DashboardPager.tsx`, `DashboardHeader.tsx`
- Domain cards: `ShiftRhythmCard.tsx`, `SleepDeficitCard.tsx`, `WeeklySummaryCard.tsx`, `WeeklyGoalsCard.tsx`, `BodyClockCard.tsx`, `AiCoachCard.tsx`
- Dashboard pages: `components/dashboard/pages/*.tsx` (sleep, rota, activity, energy, meal timing, calories)

### Sleep system (`components/sleep/`)
- Page-level sleep presentation: `SleepPage.tsx`
- Logging/editing: `LogSleepModal.tsx`, `EditSleepModal.tsx`, `SleepLogSheet.tsx`, `SleepLogListCard.tsx`
- Visualizations: `SleepTimelineBar.tsx`, `SleepQualityChart.tsx`, `Sleep7DayBars.tsx`, `CombinedSleepMetricsCard.tsx`
- Specialized cards/modals: `SocialJetlagCard.tsx`, `SocialJetlagInfoModal.tsx`, `SleepMetricsInfoModal.tsx`

### Calendar system (`components/calendar/`)
- Views: `DayView.tsx`, `WeekView.tsx`, `YearView.tsx`
- CRUD + config: `EventFormModal.tsx`, `TaskFormModal.tsx`, `EventTypesManager.tsx`, `CalendarSettings.tsx`, `CalDAVSync.tsx`
- Interaction menus: `FilterMenu.tsx`, `ViewSwitcher*.tsx`, `AddItemMenu.tsx`

### Rota and scheduling (`components/rota/`)
- `RotaSetupPage.tsx`, `ShiftPatternSet.tsx`, `AddActionFab.tsx`

### Wearables/mobile bridge UI
- `components/wearables/AutoHealthSync.tsx` (automatic sync trigger)
- `components/wearables/SyncWearableButton.tsx` (manual sync action)
- Sleep page event listener for bridge payloads: `components/dashboard/pages/SleepPage.tsx`

### Shared platform/UX
- UI primitives in `components/ui/*.tsx` (`BottomNav.tsx`, `Card.tsx`, `Toast.tsx`, etc.)
- App layout wrappers: `components/layout/BottomNavWrapper.tsx`, `FloatingCoachBubble.tsx`
- Providers: `components/providers/theme-provider.tsx`, `language-provider.tsx`
- Notifications: `components/notifications/*.tsx`

---

## 6) Database Tables and Relationships

Source of truth: `supabase/migrations/*.sql` plus app usage in `app/api/**/route.ts` and `lib/**`.

### Identity anchor
- Most domain tables relate to `auth.users(id)` via `user_id` columns.
- Profile extension table: `profiles` (multiple profile/subscription/region/age migrations).

### Major table families

**Profile/account/subscription**
- `profiles`
- Revenue/subscription columns added by migrations (`20250129_add_revenuecat_columns.sql`, `20250127_add_subscription_plan.sql`)
- Avatar storage/policies (`20250127_setup_avatars_storage_policies.sql`)

**Sleep and circadian**
- `sleep_logs` (multiple versions: `20250112_create_sleep_logs*.sql`)
- `sleep_records` (wearable sync)
- `sleep_targets`
- `circadian_logs` / `circadian_logs_v2`
- `shiftlag_logs`

**Shift/rota/calendar**
- `shifts`
- `user_shift_patterns`
- `rota_patterns`, `rota_days`, `rota_events`
- Calendar schema (`events`, `tasks`, `event_types`, `caldav_calendars`) from `20250122_simple_calendar_schema.sql`

**Activity/nutrition/wellbeing**
- `activity_logs`
- `water_logs`, `caffeine_logs`, `mood_logs`
- `nutrition_logs` and nutrition tables from 20250113-20250116 migrations

**Wearables/devices**
- `device_sources`
- `sleep_records` wearable policy migration (`20250112_create_wearable_sync.sql`)
- `wearable_heart_rate_samples` provider-agnostic HR samples (`20260321_create_wearable_heart_rate_samples.sql`)

**Metrics/summary tables**
- `daily_metrics`
- `shift_rhythm_scores`
- `weekly_summaries`
- `weekly_goals`

### Relationship patterns
- One user -> many logs/events/sleep/activity rows.
- Calendar: `tasks` and `events` are user-scoped, with reusable `event_types`.
- Wearables: token/device/sleep ingestion scoped to user identity.

---

## 7) Auth Flow

### Client-side auth
- Browser Supabase client: `lib/supabase.ts`
- Auth context/provider: `components/AuthProvider.tsx`
- Sign-in page auth execution: `app/auth/sign-in/page.tsx`

### Callback and session exchange
- OAuth/email callback handler: `app/auth/callback/route.ts`
- Uses route handler client helper: `lib/supabase-server-auth.ts`

### Server-side API identity resolution (hardened)
- Central resolver: `lib/supabase/server.ts`
- Current behavior:
  - Always attempts to resolve the user from request/session (`supabase.auth.getUser()`).
  - Never falls back to fixed user identity.
  - Never auto-switches to service-role on auth failure.
  - Returns unauthenticated context (`userId: null`) when there is no valid session.
- New strict helpers in `lib/supabase/server.ts`:
  - `buildUnauthorizedResponse()` -> consistent `401` with `{ error: 'Unauthorized' }`
  - `requireServerUser()` -> strict helper that throws `UnauthorizedError` if no session user

Result: user-scoped API routes now explicitly reject missing session with `401`.

---

## 8) API Endpoints

All endpoints are under `app/api/**/route.ts` (92 route files).  
Grouped inventory:

### Account
- `/api/account/delete`

### Activity
- `/api/activity/log`
- `/api/activity/today`

### Apple Health
- `/api/apple-health/sync`

### Blog
- `/api/blog`

### Calendar
- `/api/calendar/caldav`
- `/api/calendar/caldav/[id]`
- `/api/calendar/event-types`
- `/api/calendar/event-types/[id]`
- `/api/calendar/events`
- `/api/calendar/events/[id]`
- `/api/calendar/tasks`
- `/api/calendar/tasks/[id]`
- `/api/calendar/import/ics`
- `/api/calendar/export/ics`

### Circadian / shift rhythm / lag
- `/api/circadian/calculate`
- `/api/shift-rhythm`
- `/api/shiftlag`
- `/api/summary/week`
- `/api/today`

### Coach/AI
- `/api/coach`
- `/api/coach/check-red`
- `/api/coach/daily-greeting`
- `/api/coach/state`
- `/api/coach/tip`

### Cron/compute jobs
- `/api/cron/precompute-daily-scores`
- `/api/daily-metrics/compute`
- `/api/subscription/process-deletions`
- `/api/profile/update-ages`
- `/api/weekly-summary/run`

### Profile/user
- `/api/profile`
- `/api/profile/avatar`
- `/api/profile/check-age-column`
- `/api/profile/debug`
- `/api/profile/plan`

### Payments/subscriptions
- `/api/payment/create-checkout`
- `/api/payment/verify`
- `/api/subscription/cancel`
- `/api/revenuecat/cancel`
- `/api/revenuecat/status`
- `/api/revenuecat/validate-receipt`
- `/api/revenuecat/webhook`
- `/api/promo/validate`

### Wearables and sync
- `/api/wearables/sync`
- `/api/wearables/status`
- `/api/wearables/debug`
- `/api/wearables/heart-rate`
- `/api/health-connect/sync`
- `/api/sync/ingest`
- `/api/sync/status`
- `/api/google-fit/auth`
- `/api/google-fit/callback`
- `/api/google-fit/steps`
- `/api/google-fit/sleep`
- `/api/google-fit/heart-rate`

### Sleep
- `/api/sleep/24h-grouped`
- `/api/sleep/7days`
- `/api/sleep/consistency`
- `/api/sleep/deficit`
- `/api/sleep/history`
- `/api/sleep/last7`
- `/api/sleep/log`
- `/api/sleep/log/delete-by-date`
- `/api/sleep/log/[id]`
- `/api/sleep/metrics-suggestions`
- `/api/sleep/month`
- `/api/sleep/overview`
- `/api/sleep/predict`
- `/api/sleep/predict-stages`
- `/api/sleep/recent`
- `/api/sleep/sessions/by-date`
- `/api/sleep/sessions/[id]`
- `/api/sleep/social-jetlag-suggestions`
- `/api/sleep/summary`
- `/api/sleep/today`
- `/api/sleep/tonight-target`

### Logs/nutrition/meal
- `/api/logs/caffeine`
- `/api/logs/mood`
- `/api/logs/water`
- `/api/nutrition/today`
- `/api/meal-timing/today`

### Misc
- `/api/data/export`
- `/api/engine/today`
- `/api/feedback`
- `/api/shifts`
- `/api/test-openai`
- `/api/weekly-goals/latest`
- `/api/weekly-summary/latest`

---

## 8.1) API Auth Checklist (Safe-to-Ship)

### Session-required (explicit 401 enforced)
These routes now reject missing user session with `{ error: 'Unauthorized' }`:
- Activity: `/api/activity/log`, `/api/activity/today`
- Apple Health: `/api/apple-health/sync`
- Calendar: `/api/calendar/caldav`, `/api/calendar/caldav/[id]`, `/api/calendar/event-types`, `/api/calendar/event-types/[id]`, `/api/calendar/events`, `/api/calendar/events/[id]`, `/api/calendar/tasks`, `/api/calendar/tasks/[id]`, `/api/calendar/import/ics`, `/api/calendar/export/ics`
- Circadian/coach: `/api/circadian/calculate`, `/api/coach`, `/api/coach/check-red`, `/api/coach/daily-greeting`, `/api/coach/state`, `/api/coach/tip`
- Data/logs/nutrition: `/api/data/export`, `/api/engine/today`, `/api/feedback`, `/api/logs/caffeine`, `/api/logs/mood`, `/api/logs/water`, `/api/nutrition/today`, `/api/meal-timing/today`
- Deprecated Google Fit routes (return deprecation behavior): `/api/google-fit/*`
- Payments/profile/revenue: `/api/payment/create-checkout`, `/api/payment/verify`, `/api/profile`, `/api/profile/avatar`, `/api/profile/check-age-column`, `/api/profile/debug`, `/api/profile/plan`, `/api/revenuecat/cancel`, `/api/revenuecat/status`, `/api/revenuecat/validate-receipt`
- Rota/shift: `/api/rota/apply`, `/api/rota/clear`, `/api/rota/event`, `/api/rota/month`, `/api/rota/pattern`, `/api/rota/week`, `/api/shifts`, `/api/shift-rhythm`, `/api/shiftlag`
- Sleep: `/api/sleep/24h-grouped`, `/api/sleep/7days`, `/api/sleep/consistency`, `/api/sleep/deficit`, `/api/sleep/history`, `/api/sleep/last7`, `/api/sleep/log`, `/api/sleep/log/[id]`, `/api/sleep/log/delete-by-date`, `/api/sleep/metrics-suggestions`, `/api/sleep/month`, `/api/sleep/overview`, `/api/sleep/predict-stages`, `/api/sleep/recent`, `/api/sleep/sessions/by-date`, `/api/sleep/sessions/[id]`, `/api/sleep/social-jetlag-suggestions`, `/api/sleep/summary`, `/api/sleep/today`, `/api/sleep/tonight-target`
- Other user routes: `/api/subscription/cancel`, `/api/summary/week`, `/api/sync/status`, `/api/today`, `/api/wearables/sync`, `/api/wearables/status`, `/api/wearables/debug`, `/api/weekly-goals/latest`, `/api/weekly-summary/latest`

### Public/system (not session-gated by design)
- Bearer/JWT verified: `/api/sync/ingest`, `/api/account/delete`
- Cron/secret/system jobs: `/api/cron/precompute-daily-scores`, `/api/weekly-summary/run`, `/api/daily-metrics/compute`, `/api/profile/update-ages`, `/api/subscription/process-deletions`
- Third-party webhook: `/api/revenuecat/webhook`
- Public or bootstrap: `/api/blog`, `/api/test-openai`
- Computation/public utility: `/api/sleep/predict`
- Optional-session business logic: `/api/promo/validate`

### Remaining security follow-up
- Some session-required routes still use `supabaseServer` for data operations after checking `userId`; this is safer than fallback-user behavior, but still bypasses RLS and should be reduced over time.

## 9) External Services / Integrations

### Supabase
- Client auth/data: `lib/supabase.ts`
- Service role backend: `lib/supabase-server.ts`
- Server auth resolver: `lib/supabase/server.ts`

### Health Connect + legacy Google Fit
- Android primary ingestion: `app/api/health-connect/sync/route.ts`
- Provider-agnostic wearable heart rate: `app/api/wearables/heart-rate/route.ts`
- Wearables sync/status now provider-aware: `app/api/wearables/sync/route.ts`, `app/api/wearables/status/route.ts`
- Google Fit routes are decommissioned to explicit deprecation behavior: `app/api/google-fit/*`

### Apple Health
- Ingestion endpoint: `app/api/apple-health/sync/route.ts`

### Stripe
- Checkout + verification routes: `app/api/payment/create-checkout/route.ts`, `app/api/payment/verify/route.ts`

### RevenueCat
- Webhook/status/receipt handling in `app/api/revenuecat/*`

### OpenAI
- Coach and insight generation in `app/api/coach/*` and select sleep insight routes (`app/api/sleep/metrics-suggestions/route.ts`, `app/api/sleep/social-jetlag-suggestions/route.ts`, etc.)

### Capacitor + Android/Wear OS
- WebView server URL and UA: `capacitor.config.ts`
- Phone bridge: `android/app/src/main/java/com/shiftcoach/app/MainActivity.java`
- Phone listener service: `android/app/src/main/java/com/shiftcoach/app/PhoneWearListenerService.java`
- Wear listener service: `android/wear/src/main/java/com/shiftcoach/wear/WearPingListenerService.kt`
- Mobile runbook: `docs/GOLDEN_PATH_MOBILE.md`

---

## 10) Environment Variables Used

Defined/consumed across `next.config.ts`, `lib/**`, and `app/api/**`.

### Supabase/Auth
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_DEV_USER_ID` (dev-only behavior in some pages)

### AI
- `OPENAI_API_KEY`

### Revenue/subscription
- `REVENUECAT_API_KEY`
- `REVENUECAT_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_PRICE_ID_YEARLY`

### Legacy Google Fit (no longer used for active Android flow)
- `GOOGLE_FIT_CLIENT_ID`
- `GOOGLE_FIT_CLIENT_SECRET`
- `GOOGLE_FIT_REDIRECT_URI`
- `GOOGLE_FIT_REDIRECT_URI_LOCAL`

### Cron/security
- `CRON_SECRET`
- `CRON_SECRET_KEY`
- `WEEKLY_SUMMARY_SECRET`

### Email/blog
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `EMAIL_WEBHOOK_URL`
- `BLOG_FEED_URL`
- `NEXT_PUBLIC_BLOG_FEED_URL`

### Capacitor runtime
- `CAPACITOR_SERVER_URL`

---

## 11) Current Unfinished Areas / TODOs / Placeholders

Representative known unfinished or placeholder areas:

- Sleep debt and prediction placeholders in sleep APIs/libs:
  - `app/api/sleep/7days/route.ts`
  - `lib/sleep/predictSleep.ts`
  - `lib/sleep/mergeWearableSleep.ts`
- Weekly summary/cron comments and partial TODO paths:
  - `app/api/weekly-summary/run/route.ts`
- Nutrition and wearable TODOs:
  - `lib/nutrition/calculateAdjustedCalories.ts`
- Misc metrics TODOs:
  - `lib/data/getWeeklyMetrics.ts`, `lib/data/getUserMetrics.ts`
- Native purchases integration TODOs:
  - `lib/purchases/native-purchases.ts`

Also review `docs/GOLDEN_PATH_MOBILE.md` for the latest mobile/wear integration notes and caveats.

---

## 12) How Data Flows Through the App

### Typical web flow
1. UI page/component calls hooks or `fetch('/api/...')`  
   Examples: `app/(dashboard)/dashboard/page.tsx`, `lib/hooks/useShiftRhythm.ts`.
2. API route resolves user context (mostly via `getServerSupabaseAndUserId`).
3. User-scoped routes now explicitly return `401` on missing session.
4. Route calls Supabase and/or computation in `lib/` domain modules.
5. Route returns normalized payload to page/component.
6. Components render cards/charts/lists.

### Wearable/mobile flow (phone + watch + web)
1. Phone app resumes and sends Wear ping `/shiftcoach/ping` from `android/app/.../MainActivity.java`.
2. Watch receives in `android/wear/.../WearPingListenerService.kt`, replies `/shiftcoach/ack`.
3. Phone `PhoneWearListenerService.java` stores ACK timestamp and broadcasts to `MainActivity`.
4. `MainActivity` emits Capacitor JS events (`wearDataReceived`, `shiftcoach-watch-ack`) to WebView.
5. Web page listeners (for example `components/dashboard/pages/SleepPage.tsx`) react and refresh state.

### Wearables sync flow (Health Connect / Apple Health)
1. Android native ingestion posts to `/api/health-connect/sync` (or `/api/sync/ingest`) and records `device_sources`.
2. iOS ingestion uses `/api/apple-health/sync`.
3. Provider-agnostic endpoint `/api/wearables/heart-rate` reads `wearable_heart_rate_samples`.
4. `/api/wearables/sync` and `/api/wearables/status` operate provider-aware without Google Fit dependency.
5. Dashboard/sleep routes consume normalized data.

### Platform dependency status (Google Fit decommission complete)
- Google Fit is no longer part of active Android ingestion.
- Android path is now Health Connect-first (`/api/health-connect/sync`, provider-aware `/api/wearables/*`).
- Legacy Google Fit routes are retained only to return explicit deprecation responses.
- DB cleanup migration included: `20260321_drop_google_fit_tokens.sql`.

---

## 13) Biggest Technical Risks / Weak Points

1. **Service-role-heavy backend usage**  
   Multiple routes still use service role reads/writes after user checks; RLS can be bypassed by coding mistakes.

2. **Split auth model complexity**  
   Browser session auth, callback helper auth, and bearer/cron-protected system paths are mixed patterns.  
   Risk: session drift, inconsistent identity interpretation across routes.

3. **Large API/domain surface with limited hard boundaries**  
   Many endpoints and cross-cutting domain logic in `lib/`; harder to reason about ownership and side effects.

4. **High lint warning debt / brownfield quality drag**  
   Warnings intentionally suppressed in `eslint.config.mjs`; faster short term, but technical debt remains high.

5. **Mobile/web parity and environment dependency**  
   Behavior can differ between Windows/WSL/Capacitor/watch environments; see `docs/GOLDEN_PATH_MOBILE.md`.

---

## 14) Suggested Immediate Stabilization Priorities

1. Reduce service-role usage in session routes; prefer session client + RLS where possible.
2. Roll out DB cleanup migration for Google Fit token removal in all environments (`20260321_drop_google_fit_tokens.sql`).
3. Standardize API auth strategy (cookie session vs bearer token vs cron secret) and keep this checklist current.
4. Add API contract docs (method/auth/table touch points) generated from `app/api/**/route.ts`.
5. Continue wearable end-to-end smoke coverage (phone<->watch ack + sync endpoints).
6. Gradually re-enable lint rules by folder/domain with ownership.

---

## 15) Quick Reference File Index

- Runtime config: `next.config.ts`, `capacitor.config.ts`, `package.json`
- Root shell: `app/layout.tsx`
- Dashboard entry: `app/(dashboard)/dashboard/page.tsx`
- API surface: `app/api/**/route.ts`
- Auth core: `lib/supabase.ts`, `lib/supabase/server.ts`, `lib/supabase-server.ts`
- Mobile/wear bridge: `android/app/src/main/java/com/shiftcoach/app/*.java`, `android/wear/src/main/java/com/shiftcoach/wear/*.kt`
- DB schema history: `supabase/migrations/*.sql`
- Mobile runbook: `docs/GOLDEN_PATH_MOBILE.md`

