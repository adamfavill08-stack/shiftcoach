import { describe, it, expect } from 'vitest'
import { estimateShiftRowBounds } from '@/lib/shift-context/resolveShiftContext'
import { computeNightShiftSleepPlan } from '@/lib/sleep/nightShiftSleepPlan'
import { resolvePostNightAsleepByUtcMs } from '@/lib/sleep/postNightSleepHabit'
import { resolveRotaContextForSleepPlan } from '@/lib/sleep/resolveRotaForSleepPlan'
import { isNightLikeInstant } from '@/lib/sleep/sleepShiftWallClock'

const H = 60 * 60 * 1000

describe('estimateShiftRowBounds (overnight explicit timestamps + IANA zone)', () => {
  it('Test A: 19:00–07:00 on row date uses next local day end in Europe/London', () => {
    const row = {
      date: '2026-05-10',
      label: 'NIGHT',
      start_ts: '2026-05-10T18:00:00.000Z',
      end_ts: '2026-05-10T06:00:00.000Z',
    }
    const { start, end } = estimateShiftRowBounds(row, new Date(), 'Europe/London')
    expect(start.toISOString()).toBe('2026-05-10T18:00:00.000Z')
    expect(end.toISOString()).toBe('2026-05-11T06:00:00.000Z')
    expect(end.getTime() - start.getTime()).toBeGreaterThan(11.5 * H)
    expect(end.getTime() - start.getTime()).toBeLessThan(12.5 * H)
  })

  it('Test F: 07:00–19:00 same civil day does not extend end', () => {
    const row = {
      date: '2026-05-10',
      label: 'DAY',
      start_ts: '2026-05-10T06:00:00.000Z',
      end_ts: '2026-05-10T18:00:00.000Z',
    }
    const { start, end } = estimateShiftRowBounds(row, new Date(), 'Europe/London')
    expect(end.getTime()).toBeGreaterThan(start.getTime())
    expect(end.getTime() - start.getTime()).toBeCloseTo(12 * H, -2)
  })

  it('Test H: DST week — still uses calendar day +1 for morning end (Europe/London)', () => {
    const row = {
      date: '2026-03-29',
      label: 'WORK',
      start_ts: '2026-03-29T22:00:00.000Z',
      end_ts: '2026-03-29T06:00:00.000Z',
    }
    const { start, end } = estimateShiftRowBounds(row, new Date(), 'Europe/London')
    expect(end.getTime()).toBeGreaterThan(start.getTime())
    const durH = (end.getTime() - start.getTime()) / H
    expect(durH).toBeGreaterThan(7)
    expect(durH).toBeLessThan(10)
  })
})

describe('resolvePostNightAsleepByUtcMs', () => {
  it(
    'Test G: preferred clock before shift end does not jump to next-morning +1 day',
    () => {
      const shiftEnd = Date.parse('2026-05-11T06:00:00.000Z')
      expect(resolvePostNightAsleepByUtcMs(shiftEnd, '06:30', 'Europe/London')).toBeNull()
    },
    15_000,
  )
})

describe('resolveRotaContextForSleepPlan post-night anchoring', () => {
  it(
    'Test B: wrong same-day ISO + sleep after night uses shift end and profile post_night_sleep',
    () => {
    const shifts = [
      {
        date: '2026-05-10',
        label: 'NIGHT',
        start_ts: '2026-05-10T18:00:00.000Z',
        end_ts: '2026-05-10T06:00:00.000Z',
      },
    ]
    const sleepStart = Date.parse('2026-05-11T08:10:00.000Z')
    const sleepEnd = Date.parse('2026-05-11T15:30:00.000Z')
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: new Date(sleepStart).toISOString(),
          end_at: new Date(sleepEnd).toISOString(),
          type: 'main_sleep',
        },
      ],
      shifts,
      { timeZone: 'Europe/London', commuteMinutes: 30, postNightSleepRaw: '09:00' },
    )
    expect(ctx.state).toBe('ok')
    if (ctx.state !== 'ok') return
    const dutyEnd = Date.parse('2026-05-11T06:00:00.000Z')
    expect(ctx.shiftJustEnded.endMs).toBe(dutyEnd)
    const preferred = resolvePostNightAsleepByUtcMs(ctx.shiftJustEnded.endMs, '09:00', 'Europe/London')
    expect(preferred).toBe(Date.parse('2026-05-11T08:00:00.000Z'))
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: ctx.shiftJustEnded,
      nextShift: ctx.nextShift,
      commuteMinutes: ctx.commuteMinutes,
      targetSleepMinutes: 8 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: ctx.primarySleep,
      loggedNaps: ctx.loggedNaps,
      timeZone: 'Europe/London',
      postNightPreferredStartUtcMs: preferred,
      postNightSleepRaw: '09:00',
    })
    expect(plan.ok).toBe(true)
    expect(plan.suggestedSleepStartMs).toBe(preferred)
    expect(plan.calculationStepKeys).toContain('sleepPlan.calc.postNightProfileSavedTime')
    expect(plan.calculationStepKeys.some((k) => k.includes('preNightEvening'))).toBe(false)
    },
    15_000,
  )

  it(
    'Test C: night Sun→Mon, Mon OFF, still post-night recovery Mon morning',
    () => {
    const shifts = [
      {
        date: '2026-05-10',
        label: 'NIGHT',
        start_ts: '2026-05-10T18:00:00.000Z',
        end_ts: '2026-05-10T06:00:00.000Z',
      },
      { date: '2026-05-11', label: 'OFF', start_ts: null, end_ts: null },
    ]
    const sleepStart = Date.parse('2026-05-11T08:10:00.000Z')
    const sleepEnd = Date.parse('2026-05-11T16:00:00.000Z')
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: new Date(sleepStart).toISOString(),
          end_at: new Date(sleepEnd).toISOString(),
          type: 'main_sleep',
        },
      ],
      shifts,
      { timeZone: 'Europe/London', postNightSleepRaw: '09:00' },
    )
    expect(ctx.state).toBe('ok')
    if (ctx.state !== 'ok') return
    const preferred = resolvePostNightAsleepByUtcMs(ctx.shiftJustEnded.endMs, '09:00', 'Europe/London')
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: ctx.shiftJustEnded,
      nextShift: ctx.nextShift,
      commuteMinutes: ctx.commuteMinutes,
      targetSleepMinutes: 8 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: ctx.primarySleep,
      loggedNaps: ctx.loggedNaps,
      timeZone: 'Europe/London',
      postNightPreferredStartUtcMs: preferred,
      postNightSleepRaw: '09:00',
    })
    expect(plan.transition === 'night_to_off' || plan.transition === 'no_next_shift').toBe(true)
    expect(plan.suggestedSleepStartMs).toBe(preferred)
    expect(plan.suggestedSleepEndMs).toBe(Date.parse('2026-05-11T16:00:00.000Z'))
    if (plan.suggestedSleepStartMs != null && plan.suggestedSleepEndMs != null) {
      const endLocal = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(plan.suggestedSleepEndMs))
      expect(endLocal).toBe('2026-05-11')
    }
    },
    15_000,
  )

  it(
    'Test D: single night row, no next shift — post-night branch with profile time',
    () => {
    const shifts = [
      {
        date: '2026-06-01',
        label: 'NIGHT',
        start_ts: '2026-06-01T21:00:00.000Z',
        end_ts: '2026-06-01T05:00:00.000Z',
      },
    ]
    const sleepStart = Date.parse('2026-06-02T08:00:00.000Z')
    const sleepEnd = Date.parse('2026-06-02T14:00:00.000Z')
    const ctx = resolveRotaContextForSleepPlan(
      [
        {
          start_at: new Date(sleepStart).toISOString(),
          end_at: new Date(sleepEnd).toISOString(),
          type: 'main_sleep',
        },
      ],
      shifts,
      { timeZone: 'Europe/London', postNightSleepRaw: '09:30' },
    )
    expect(ctx.state).toBe('ok')
    if (ctx.state !== 'ok') return
    const preferred = resolvePostNightAsleepByUtcMs(ctx.shiftJustEnded.endMs, '09:30', 'Europe/London')
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: ctx.shiftJustEnded,
      nextShift: null,
      commuteMinutes: 25,
      targetSleepMinutes: 8 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: ctx.primarySleep,
      loggedNaps: [],
      timeZone: 'Europe/London',
      postNightPreferredStartUtcMs: preferred,
      postNightSleepRaw: '09:30',
    })
    expect(plan.ok).toBe(true)
    expect(plan.transition).toBe('night_to_off')
    expect(plan.suggestedSleepStartMs).toBe(preferred)
    },
    15_000,
  )

  it('Test E: CUSTOM overnight without NIGHT label is night-like after bounds fix', () => {
    const row = {
      date: '2026-05-12',
      label: 'CUSTOM',
      start_ts: '2026-05-12T21:00:00.000Z',
      end_ts: '2026-05-12T05:00:00.000Z',
    }
    const { start, end } = estimateShiftRowBounds(row, new Date(), 'Europe/London')
    const instant = {
      label: 'CUSTOM',
      date: row.date,
      startMs: start.getTime(),
      endMs: end.getTime(),
    }
    expect(isNightLikeInstant(instant, 'Europe/London')).toBe(true)
  })
})

describe('computeNightShiftSleepPlan: profile post_night_sleep vs sleep logs', () => {
  it('uses onboarding 09:00 after duty end, not logged 09:45, when postNightSleepRaw parses', () => {
    const shiftEnd = Date.parse('2026-05-11T06:00:00.000Z')
    const shiftStart = Date.parse('2026-05-10T18:00:00.000Z')
    const loggedStartWrong = Date.parse('2026-05-11T08:45:00.000Z')
    const profileNine = Date.parse('2026-05-11T08:00:00.000Z')
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: { label: 'NIGHT', date: '2026-05-10', startMs: shiftStart, endMs: shiftEnd },
      nextShift: null,
      commuteMinutes: 30,
      targetSleepMinutes: 8 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: { startMs: loggedStartWrong, endMs: Date.parse('2026-05-11T15:30:00.000Z') },
      loggedNaps: [],
      timeZone: 'Europe/London',
      postNightPreferredStartUtcMs: loggedStartWrong,
      postNightSleepRaw: '09:00',
    })
    expect(plan.ok).toBe(true)
    expect(plan.suggestedSleepStartMs).toBe(profileNine)
    expect(plan.suggestedSleepStartMs).not.toBe(loggedStartWrong)
  })

  it('keeps a synthetic post-night OFF-day preview on the duty-based recovery window', () => {
    const shiftEnd = Date.parse('2026-05-11T06:00:00.000Z')
    const nowMs = Date.parse('2026-05-11T12:00:00.000Z')
    const preferredStart = Date.parse('2026-05-11T08:00:00.000Z')
    const plan = computeNightShiftSleepPlan({
      shiftJustEnded: {
        label: 'NIGHT',
        date: '2026-05-10',
        startMs: Date.parse('2026-05-10T18:00:00.000Z'),
        endMs: shiftEnd,
      },
      nextShift: null,
      commuteMinutes: 30,
      targetSleepMinutes: 8 * 60,
      caffeineSensitivity: 'medium',
      loggedMainSleep: {
        startMs: nowMs,
        endMs: nowMs + 8 * 60 * 60 * 1000,
      },
      loggedNaps: [],
      timeZone: 'Europe/London',
      postNightPreferredStartUtcMs: preferredStart,
      postNightSleepRaw: '09:00',
    })
    expect(plan.ok).toBe(true)
    expect(plan.suggestedSleepStartMs).toBe(preferredStart)
    expect(plan.transition).toBe('night_to_off')
  })
})
