# Suggested sleep plan — architecture map

There are **two systems**: the **“Your plan”** tab (`SuggestedSleepPlanCard` + `computeNightShiftSleepPlan`) and the **log-sleep modal** suggestions (`inferShiftAwareSleepLog` in `LogSleepModal`). They share rota/shift bounds ideas (`estimateShiftRowBounds`, night-like detection) but serve different jobs.

---

## 1. Where it lives in the UI

### A. “Your plan” tab (night-shift style calculator card)

| Piece | Path |
|--------|------|
| Page | `components/sleep/ShiftWorkerSleepPage.tsx` |
| Tabs | `overview` \| `plan` (`sleepTab`). Plan tab renders the suggested-plan UI. |
| Card | `components/sleep/SuggestedSleepPlanCard.tsx` — presentation, formatting, caffeine radios; **no** rota math. |

### B. Log sleep modal (type suggestion + warnings while entering times)

| Piece | Path |
|--------|------|
| Modal | `components/sleep/LogSleepModal.tsx` |
| Inference | `lib/sleep/inferShiftAwareSleepLog.ts` |
| Wiring | `ShiftWorkerSleepPage` passes `shiftPlanRows` and `sleepPlanTimeZone` into `LogSleepModal` as the `timeZone` prop. |

---

## 2. “Your plan” — data and scope logic (`ShiftWorkerSleepPage`)

### Time zones

- **`userTimeZone`:** `Intl.DateTimeFormat().resolvedOptions().timeZone` (browser).
- **`sleepPlanTimeZone`:** `profile.tz` from `/api/profile` if set, else `userTimeZone`. Used for plan, rota bounds, and the modal when passed as `timeZone`.
- **`chartHighlightYmd`:** “Today” in `sleepPlanTimeZone` — `formatYmdInTimeZone(new Date(), sleepPlanTimeZone)`.

### Which calendar day the plan is scoped to (`sleepPlanScopeYmd`)

The plan is not always “today’s civil date”; it can **stay pinned to yesterday** briefly after a suggested main-sleep start:

1. **`yesterdayPlanAnchorYmd`** = `chartHighlightYmd` minus 1 day.
2. **`yesterdaySleepPlanPayload`** = `computeSleepPlanForScope(yesterdayPlanAnchorYmd, planSessionsYesterday, planTargetYesterdayMinutes)`.
3. **`sleepPlanScopeYmd`:**
   - If yesterday’s plan is **`ok`** and has `suggestedSleepStartMs`, and **`Date.now() < suggestedSleepStartMs + SLEEP_PLAN_SCOPE_PIN_MS`** where **`SLEEP_PLAN_SCOPE_PIN_MS = 3` hours**, then scope = **`yesterdayPlanAnchorYmd`**.
   - Else scope = **`chartHighlightYmd`** (today).

After civil midnight, “Your plan” can still show **yesterday’s** scope until **3 hours after yesterday’s suggested main-sleep start**. A **`sleepPlanClockTick`** interval (every 60s) forces recomputation so the pin can expire.

### Which sessions feed the plan (`pickPlanSessionsForCivilYmd`)

For a given civil `ymd`:

1. Prefer that day’s sessions from **`sevenDayCalendarDays`** (from `/api/sleep/7days`).
2. If that day has **no primary sleep** (`rowCountsAsPrimarySleep`), **walk back**: merge sessions from **`ymd-1`**, **`ymd-2`**, then optionally **whole week + shifted buckets** (deduped by `id` or `start|end`), until a primary appears — so post–night sleep on the morning after still gets data when the “wake” civil day has thin slices.

### Targets and debt passed into the planner

- **`planTargetSleepMinutes`:** from `sleep_goal_h` (profile) or default **`DEFAULT_TARGET_SLEEP_H` (7h)**, then **`getShiftAdjustedTargetMinutes(base, shiftLabelForDay)`**:
  - `NIGHT` → ×1.1  
  - `EARLY` → ×1.05  
  - `OFF` → ×0.95  
  - else base  

  The label comes from **`shiftByDate.get(sleepPlanScopeYmd)`** (rota label string), **not** the modal inferrer.

- **`sleepDebtMinutes`:** `max(0, adjustedTargetMinutes - totalMinutes)` for the overview’s selected/calendar sessions; the plan passes this optional debt into **`computeNightShiftSleepPlan`** to relax floors when debt is high.

### `computeSleepPlanForScope` (bridge from UI → pure math)

For each `(scopeYmd, sessions, targetSleepMinutes)`:

1. **`sessionLikesBase`:** `{ start_at, end_at, type }` from sessions.
2. **`rosterNightOnScope`:** scope day’s label looks like night (`NIGHT` in string or `toShiftType === 'night'`).
3. **`buildForwardPostNightPreviewSession`** (optional): if there is a **night on `scopeYmd` that has not ended yet** and the user has **no logged primary sleep ending after that night’s end**, synthesize a **future** `main_sleep` session so **`pickPrimarySleep`** in the resolver picks **this** night’s cycle (`lib/sleep/forwardPostNightPlanPreview.ts` — commute + wind-down + min 4h synthetic duration).
4. **`sessionLikes`** = `[forwardPreview?, ...sessionLikesBase]`.
5. **`resolveRotaContextForSleepPlan(sessionLikes, shiftPlanRows, { commute, timeZone, postNightSleepRaw })`** → **`rota`** (`state: 'ok' | 'insufficient_data'`).
6. If `rota.state !== 'ok'` → return `{ rota, plan: null }`.
7. **`forcedLatestWakeMs`** from **`forcedLatestWakeBeforeTonightsNight`:** if **tonight** (on `scopeYmd`) is a **night** shift starting **after** primary sleep end, cap wake at prep + commute before that duty start (`PREP_BEFORE_NEXT_SHIFT`, `MAX_COMMUTE_MINUTES`).
8. **`postNightPreferredStartUtcMs`** from **`resolvePostNightPreferredStartForSleepPlan`** (`lib/sleep/postNightSleepHabit.ts`):
   - Real night anchor & not synthetic → **`resolvePostNightAsleepByUtcMs(shiftEnd, postNightSleepRaw, tz)`** only.
   - Else → **`postNightStartDayAfterScopeUtcMs(scopeYmd, postNightSleepRaw, tz)`** for off/synthetic paths.
9. **`computeNightShiftSleepPlan({...})`** → **`plan`**.

**`SuggestedSleepPlanCard`** receives: `timeZone`, `todayYmd` (= **`sleepPlanScopeYmd`**), `rota`, `plan`, `targetSleepMinutes`, `caffeineSensitivity`, `onCaffeineSensitivityChange`.

---

## 3. Rota context resolution (`resolveRotaContextForSleepPlan`)

**File:** `lib/sleep/resolveRotaForSleepPlan.ts`

**Inputs:** session likes + `ShiftRowInput[]` + options (`commuteMinutes`, `timeZone`, `postNightSleepRaw`, `targetSleepMinutes`).

### 3a. Shift-relative classification (strict geometry)

**File:** `lib/sleep/shiftRelativeSleepClassification.ts`

For the **primary sleep interval** only, the resolver always runs **`analyzeSleepBlockRelativeToShifts`**, which:

- Builds sorted work instants (`buildWorkInstantsForClassification`).
- Finds **nearest previous completed work** at sleep start (with grace for “bed slightly before nominal shift end”) and **nearest upcoming work** at sleep end (`findNearestPreviousWorkBlock`, `findNearestUpcomingWorkBlock`).
- Derives features (minutes since previous end, minutes until next start, duration, OFF-day flags, rest-gap flags, quick turnaround, overlap with work).
- Emits **`sleepClass`**, **`recoveryState`**, and a **localisable next-step** (`nextStepMessage`: i18n key + `{ next }` params — see `sleepPlan.shiftRelative.*` in `lib/i18n/sleepUiMessages.ts`).

This path is **shift-relative**: it does **not** choose the suggested sleep window from calendar labels alone; it reasons from instants on the timeline.

**Important:** keep this **separate in your head** from the planner’s “which shift ended / which shift is next?” anchors below. The analysis object’s **`previousWork` / `upcomingWork`** are the strict neighbours for **classification**. They are **not** always the same instants as **`shiftJustEnded` / `nextShift`** used for window geometry in `computeNightShiftSleepPlan`.

### 3b. Planner anchors and `nextShift` (heuristics)

The same file also chooses **`shiftJustEnded`**, **`nextShift`**, and related fields for **`computeNightShiftSleepPlan`**:

- Build work instants with **`estimateShiftRowBounds`** per row (fixes overnight `end_ts` ≤ `start_ts` using IANA zone).
- **`pickPrimarySleep`:** among sessions that count as primary (`rowCountsAsPrimarySleep`), pick the one with **latest wake** (`endMs`) — not “longest”.
- **Anchor `shiftJustEnded`:** starts from **`shiftRelative.previousWork`**, but can **drop a stale night** anchor when sleep is not “morning recovery” and starts more than **12h** after that night ended; otherwise **`syntheticRestAnchor`** → **`restAnchorSynthetic: true`**.
- **`nextShift`:** **`pickUpcomingWorkForSleepPlan`** (lookahead / day→next-calendar-night behaviour), then **`findFirstNightLikeAfterSleepEnd`** fallback — **not** “nearest upcoming instant at wake” alone, so the **suggested window** and nap anchors stay usable on realistic rotas.
- **`maybeUpgradeAnchorForEveningPostNightRecovery`:** can re-anchor to the finishing night for evening post-night logs; **`nextShift`** is recomputed with the same **`pickUpcomingWorkForSleepPlan`** rule after an upgrade.

**Outputs:** `shiftJustEnded`, `nextShift`, `primarySleep`, `loggedNaps`, `gapMsBeforeSleep`, `commuteMinutes` (capped with `MAX_COMMUTE_MINUTES` from `nightShiftSleepPlan`), `restAnchorSynthetic`, plus **`shiftRelative`** (full classification analysis for the card).

**Insufficient states** (no `plan` from resolver path): `no_sessions`, `no_main_sleep`, `no_shift_anchor`. The card’s **`plan.ok === false`** states come from **`computeNightShiftSleepPlan`** (`no_main_sleep`, `no_prior_shift`) — different layer from rota `insufficient_data`.

**Regression guard:** if someone “simplifies” the resolver by wiring **`nextShift`** or **`shiftJustEnded`** directly from **`shiftRelative.upcomingWork` / `previousWork`**, classification may still look fine while **geometry** (evening floors, pre-night naps, tests) regresses. When changing either side, run **`tests/lib/dayOffSleepPlan.test.ts`** and **`tests/lib/nightShiftSleepPlan.test.ts`** together with **`tests/lib/shiftRelativeSleepClassification.test.ts`**.

---

## 4. Core plan math (`computeNightShiftSleepPlan`)

**File:** `lib/sleep/nightShiftSleepPlan.ts` — pure function, no I/O.

### Early exits (`plan.ok === false`)

- No `loggedMainSleep` → `reason: 'no_main_sleep'`, keys include `sleepPlan.calc.noMainSleep`.
- No `shiftJustEnded` → `reason: 'no_prior_shift'`, `sleepPlan.calc.needShiftBeforeSleep`.

### Transition typing

- **`classifySleepPlanTransition`** (`lib/sleep/sleepShiftWallClock.ts`): anchor + next + `offAnchorSynthetic` → one of  
  `night_to_off`, `no_next_shift`, `off_to_night`, `night_to_night`, `night_to_day`, `late_to_early`, `early_to_night`, `dayish_work_to_night`, `other`.
- **`transitionSummaryKey`** = `sleepPlan.transition.${transition}` (i18n).

### Constants (behaviour knobs)

Examples: `WIND_DOWN_MINUTES` (30), `MAX_COMMUTE_MINUTES` (45), `PREP_BEFORE_NEXT_SHIFT` (60), `NAP_END_BEFORE_SHIFT` (90), `NAP_LENGTH` (25), `MIN_SLEEP_MINUTES` (240), `DEFAULT_TARGET_SLEEP_H` (7), pre-night nap windows (`PRE_NIGHT_NAP_*`), `POST_DAY_BEFORE_NIGHT_MIN_REST_MS`, evening floor minutes (`EVENING_MAIN_BED_FLOOR_*`), `LONG_REST_GAP_BEFORE_SLEEP_MS`, `OPEN_RECOVERY_MAX_MS`, `TIGHT_*` thresholds, etc.

### Main geometry (all `ok` paths)

- Overlap check: logged main sleep overlaps anchor shift block → feedback `overlap_shift` (warn).
- `earliestSleepStartMs` = shift end + commute + wind-down.
- `latestWakeMs` = next shift start − prep − commute (if next); merged with `forcedLatestWakeMs`.
- **Pre-night family (`pNight`):** evening bed floor, sleep-debt relaxation, tight day→night warnings, long-gap floor, optional 8–9h target band, relax earliest if wake cap tight (`tight_recovery_window`).
- **Generic window:** if `latestWakeMs` and room: start = earliest, end = min(start + target, latestWake), min 4h when possible; else no room / open-ended recovery (`open_ended_recovery`) with clamp if next shift appears.
- **Post-night branch:** prefers `postNightPreferredStartMs` (profile / page hint) floored with home + wind-down; caps end; `post_night_profile_outside_window`, `shorter_than_planned` feedback as needed.
- **Naps:** pre-night dynamic nap vs classic shortfall nap vs `resolveForcedDayToNightPreNightNapWindow` for day→night transitions.
- **Caffeine:** `caffeineOffsetBeforeSleep(sensitivity)` before main (or nap in pre-night case) → `caffeineCutoffMs`.
- **`calculationStepKeys`:** stable i18n keys for the “How calculated” list.

### Card UI mapping (`SuggestedSleepPlanCard`)

- Scope: `sleepPlan.scopeLine` with `todayYmd` (= scope civil date).
- Window: `formatSuggestedSleepWindowRange` for start/end ms.
- Explainer: `sleepPlan.windowExplainer` / `windowExplainerNoWindow` with model hours.
- Transition: `t(plan.transitionSummaryKey)`.
- **Shift-relative panel** (when `plan.shiftRelative` is set): `sleepPlan.shiftRelative.class.*`, `sleepPlan.shiftRelative.recovery.*`, and `t(plan.shiftRelative.nextStepMessage.key, plan.shiftRelative.nextStepMessage.params)` — not hard-coded English from the engine.
- Feedback: drop `code === 'none'`; warn styling; `sleepPlan.feedback.${code}`.
- Caffeine radios → `handleCaffeineSensitivityChange` → `POST /api/profile` `preferences.caffeineSensitivity`.
- Nap line: `sleepPlan.nap.whenApprox` / `sleepPlan.nap.none`.
- Light / recovery: `sleepPlan.light.body`, `sleepPlan.recovery.*`.
- How: `plan.calculationStepKeys` via `t(key)`.
- Disclaimer: `sleepPlan.disclaimerShort`.

---

## 5. Log modal — suggested type (`inferShiftAwareSleepLog`)

**File:** `lib/sleep/inferShiftAwareSleepLog.ts` — picks **`SleepType`**, reason, warnings for **saving** a log; **not** the full plan engine.

**Detection summary:**

- Invalid interval → fallback `main_sleep`.
- **`buildWorkInstants`:** non-off rows, `estimateShiftRowBounds`, sorted.
- **`overlapsShift`** → warning `overlaps_shift`.
- **`endedBeforeSleep`:** shifts with `endMs <= startMs + 45 min`, sort by latest end.
- **`nightAnchor`:** night-like instant where sleep start is **≥ 45 min before** that night’s end and **≤ 14h after** night end (`startMs - endMs` in `[-45min, 14h]`).
- **`recentShift`:** `nightAnchor` else shift ended within **6h** before sleep (same 45 min early grace).
- **`nextShift`:** first shift with `startMs >= sleep end` within **18h**; **`nextNight`** if that shift is night-like.
- **Type:** night anchor → `post_shift_sleep` / `post_night`; else recent shift → `post_shift_sleep` / `post_shift`; else short sleep before next night → `nap` / `pre_night_nap`; else short duration → `nap` / `nap_length`; else `main_sleep`.
- **`off_day_after_night`:** wake civil day is OFF on rota and `nightAnchor` was night-like → warning.

**`LogSleepModal`:** `previewTimes` → `rotaSuggestion`; auto-sync `form.type` unless `manualTypeEdited`; blue info box (note: reason **summary** strings are currently hard-coded English); submit includes `timezone` and numeric quality via parent → `/api/sleep/log`.

---

## 6. Related overview logic (same page, not the plan card)

**`shiftLabelForSleepSession`** + **`rosterNightNearSleepSession`:** if primary sleep is near a roster **night** (sleep start/end civil days or **previous** civil day), treat effective label as **`NIGHT`** for **circadian alignment** and **shift-adjusted targets** — separate from the modal’s OFF-after-night **warning**.

---

## 7. i18n

Plan copy under **`sleepPlan.*`** in locale bundles (`SuggestedSleepPlanCard` lists keys: `title`, `tabYourPlan`, `section.*`, `feedback.*`, `transition.*`, `caffeine*`, `calc.*`, **`shiftRelative.*`**, etc.). English lives in **`lib/i18n/sleepUiMessages.ts`**; other app languages merge overlay chunks and fall back to English for missing keys.

---

## 8. Suggested read order (files)

1. `components/sleep/ShiftWorkerSleepPage.tsx`  
2. `lib/sleep/forwardPostNightPlanPreview.ts`  
3. `lib/sleep/shiftRelativeSleepClassification.ts` (strict classification vs planner anchors — read §3)  
4. `lib/sleep/resolveRotaForSleepPlan.ts`  
5. `lib/sleep/nightShiftSleepPlan.ts`  
6. `lib/sleep/sleepShiftWallClock.ts`  
7. `components/sleep/SuggestedSleepPlanCard.tsx`  
8. `lib/sleep/inferShiftAwareSleepLog.ts`  
9. `components/sleep/LogSleepModal.tsx`
