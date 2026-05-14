# Sleep / rota follow-up patch (applied)

Codex applied the sleep/rota follow-up patch. Treat the codebase as including the following unless a branch says otherwise.

## New Files

- `lib/sleep/inferShiftAwareSleepLog.ts` - Infers sleep type from sleep window plus rota rows: post-night recovery, post-normal-shift sleep, pre-night naps, short naps, overlap with shift, and OFF day after night.
- `lib/sleep/pickSleepPlanSessions.ts` - Picks sessions for the suggested-plan calculation without borrowing stale first-day-off recovery sleep into later OFF days.
- `lib/sleep/dayOffSleepPlan.ts` - Builds a forward normal sleep window for later OFF days, using the user's latest full overnight sleep as the wall-clock pattern.
- `lib/sleep/sleepPlanScope.ts` - Keeps the "Your plan" scope pinned to the previous night-duty cycle through the post-night recovery window when the next civil day is `OFF`.
- `tests/lib/inferShiftAwareSleepLog.test.ts`
- `tests/lib/sleepPlanScope.test.ts`

## Sleep Payload Normalization

`lib/sleep/normalizeSleepLogPayload.ts`:

- `normalizeSleepType()` maps known aliases such as `sleep` / `main` to `main_sleep`; unknown non-empty strings return `null` so the API can reject them. Empty or missing type still resolves to `main_sleep`.
- `normalizeIanaTimeZone()` validates client-supplied IANA time zones.

## Sleep APIs

`POST app/api/sleep/log/route.ts`:

- Accepts `timezone` in JSON or `x-time-zone` header.
- Validates timezone with `normalizeIanaTimeZone`; invalid non-empty value returns `400 invalid_timezone`.
- Persists `sleep_logs.timezone` using the client zone when valid, otherwise the server `Intl` zone.
- Writes metadata `{ timezone_source: 'client' }` or `{ timezone_source: 'server' }`.
- Unknown sleep type after normalization returns `400 invalid_sleep_type`.

`PATCH app/api/sleep/sessions/[id]/route.ts`:

- Accepts and validates client timezone.
- Writes canonical `timezone` on the row.

Legacy `app/api/sleep/log/[id]/route.ts`:

- `PUT` is canonical-first: updates `start_at`, `end_at`, `type`, `quality`, `timezone`, and `updated_at`; response may still expose legacy-shaped fields for old callers.
- `DELETE` soft-deletes via `deleted_at` instead of hard-deleting.

## UI Timezone Writes

These components send browser timezone:

- `components/sleep/LogSleepModal.tsx`
- `components/sleep/QuickSleep.tsx`
- `components/sleep/SleepLogSheet.tsx`
- `components/sleep/Sleep7DayBars.tsx`
- `components/sleep/EditSleepModal.tsx`

## Log Sleep Modal

`components/sleep/LogSleepModal.tsx`:

- Accepts optional `shiftRows` and `timeZone`.
- Runs `inferShiftAwareSleepLog()`.
- Auto-suggests sleep type unless the user overrides it.
- Shows linked previous/next shift context.
- Shows OFF-after-night and overlap warnings.

## Shift Worker Sleep Page

`components/sleep/ShiftWorkerSleepPage.tsx`:

- Passes `shiftPlanRows` and `sleepPlanTimeZone` into `LogSleepModal`.
- Retains post-night sleep on an OFF calendar day as night recovery via `rosterNightNearSleepSession` / `shiftLabelForSleepSession`.
- Uses `shouldKeepPreviousNightRecoveryScope()` so post-night recovery stays attached to the night-shift scope until the suggested recovery window finishes, not just 3 hours after the suggested sleep start. This includes the common rota shape `NIGHT -> OFF -> DAY`, where the planner transition is technically `night_to_day` because the next work row is a later day shift.
- Shows the suggested-plan scope date as the actual recovery sleep start date for post-night plans.
- Uses `pickSleepPlanSessionsForCivilYmd()` so `NIGHT -> OFF -> OFF` does not show day 1's 08:00 recovery sleep again on day 2 off, while still counting a normal last-night sleep that started before midnight and woke on the current day even if the API bucketed it under yesterday.
- Uses `buildNormalDayOffSleepPlan()` on later OFF days so a 2 days / 2 nights / 4 off pattern shows today's date and a normal tonight sleep window, not yesterday's post-night recovery sleep.
- `resolveRotaContextForSleepPlan()` now treats evening/overnight sleeps more than 12 hours after a night shift ends as normal rest sleeps instead of anchoring them back to that night shift.

## Suggested Plan Night-To-Off Fix

- `lib/sleep/forwardPostNightPlanPreview.ts` now creates the synthetic post-night preview not only before a night shift ends, but also while that night has recently ended and no primary sleep has been logged after it.
- `lib/sleep/nightShiftSleepPlan.ts` keeps synthetic post-night previews on the duty-based recovery window instead of sliding the main-sleep start forward to the current clock time.
- Regression coverage:
  - `tests/lib/forwardPostNightPlanPreview.test.ts`
  - `tests/lib/sleepPlanScope.test.ts`
  - `tests/lib/sleepRotaMidnightCrossing.test.ts`

## Other UI Cleanup

- `components/sleep/EditSleepModal.tsx` uses `/api/sleep/sessions/[id]` for PATCH and DELETE.
- `app/(app)/sleep/logs/page.tsx` delete path uses `/api/sleep/sessions/[id]`, not legacy `log/[id]`.

## Tests

- Extended `tests/lib/normalizeSleepLogPayload.test.ts`.
- Added `tests/lib/inferShiftAwareSleepLog.test.ts`.
- Added night-to-OFF scope/preview regressions.

### Suggested Validation Command

```bash
npm test -- tests/lib/normalizeSleepLogPayload.test.ts tests/lib/inferShiftAwareSleepLog.test.ts tests/lib/forwardPostNightPlanPreview.test.ts tests/lib/sleepPlanScope.test.ts tests/lib/sleepRotaMidnightCrossing.test.ts tests/lib/nightShiftSleepPlan.test.ts
npm test -- tests/lib/pickSleepPlanSessions.test.ts tests/lib/dayOffSleepPlan.test.ts
npx tsc --noEmit
npm run lint
```

## Explicit Follow-Up Not Done

Legacy DB columns such as `start_ts`, `end_ts`, `date`, and `naps` were not removed. The repo still has legacy fallback readers. The app is canonical-first on writes; physical legacy-column removal should be a separate migration and read-path audit.
