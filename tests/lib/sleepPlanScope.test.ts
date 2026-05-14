import { describe, expect, it } from 'vitest'
import { shouldKeepPreviousNightRecoveryScope } from '@/lib/sleep/sleepPlanScope'
import type { NightShiftSleepPlanResult } from '@/lib/sleep/nightShiftSleepPlan'

function plan(overrides: Partial<NightShiftSleepPlanResult> = {}): NightShiftSleepPlanResult {
  return {
    ok: true,
    transition: 'night_to_off',
    transitionSummaryKey: 'sleepPlan.transition.night_to_off',
    earliestSleepStartMs: Date.parse('2026-05-11T08:00:00.000Z'),
    latestWakeMs: null,
    suggestedSleepStartMs: Date.parse('2026-05-11T08:00:00.000Z'),
    suggestedSleepEndMs: Date.parse('2026-05-11T16:00:00.000Z'),
    modelSleepMs: 8 * 60 * 60 * 1000,
    caffeineCutoffMs: null,
    napSuggested: false,
    napWindowStartMs: null,
    napWindowEndMs: null,
    feedback: [{ code: 'none', severity: 'info' }],
    calculationStepKeys: [],
    suggestedSleepWindowKind: 'reset_after_final_night',
    ...overrides,
  }
}

describe('shouldKeepPreviousNightRecoveryScope', () => {
  it('keeps a night-to-OFF plan pinned through the recovery sleep window', () => {
    expect(
      shouldKeepPreviousNightRecoveryScope({
        nowMs: Date.parse('2026-05-11T14:00:00.000Z'),
        currentShiftLabel: 'OFF',
        previousPlan: plan(),
        previousRota: {
          state: 'ok',
          shiftJustEnded: {
            label: 'NIGHT',
            date: '2026-05-10',
            startMs: Date.parse('2026-05-10T18:00:00.000Z'),
            endMs: Date.parse('2026-05-11T06:00:00.000Z'),
          },
        },
        timeZone: 'Europe/London',
        shortPinMs: 3 * 60 * 60 * 1000,
      }),
    ).toBe(true)
  })

  it('keeps post-night recovery pinned when today is OFF but the next work row is a later DAY shift', () => {
    expect(
      shouldKeepPreviousNightRecoveryScope({
        nowMs: Date.parse('2026-05-11T14:00:00.000Z'),
        currentShiftLabel: 'OFF',
        previousPlan: plan({
          transition: 'night_to_day',
          transitionSummaryKey: 'sleepPlan.transition.night_to_day',
        }),
        previousRota: {
          state: 'ok',
          shiftJustEnded: {
            label: 'NIGHT',
            date: '2026-05-10',
            startMs: Date.parse('2026-05-10T18:00:00.000Z'),
            endMs: Date.parse('2026-05-11T06:00:00.000Z'),
          },
        },
        timeZone: 'Europe/London',
        shortPinMs: 3 * 60 * 60 * 1000,
      }),
    ).toBe(true)
  })

  it('does not keep the previous scope after the recovery grace has passed', () => {
    expect(
      shouldKeepPreviousNightRecoveryScope({
        nowMs: Date.parse('2026-05-11T20:30:00.000Z'),
        currentShiftLabel: 'OFF',
        previousPlan: plan(),
        previousRota: {
          state: 'ok',
          shiftJustEnded: {
            label: 'NIGHT',
            date: '2026-05-10',
            startMs: Date.parse('2026-05-10T18:00:00.000Z'),
            endMs: Date.parse('2026-05-11T06:00:00.000Z'),
          },
        },
        timeZone: 'Europe/London',
        shortPinMs: 3 * 60 * 60 * 1000,
      }),
    ).toBe(false)
  })
})
