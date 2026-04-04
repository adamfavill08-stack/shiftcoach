import { describe, it, expect } from 'vitest'
import {
  buildCircadianHabitBullets,
  buildForecastRecoveryLine,
  buildTodaysTakeaway,
  buildTransitionForecastNote,
} from '@/lib/body-clock/bodyClockCircadianUi'
import type { CircadianState } from '@/lib/circadian/calculateCircadianScore'
import type { UserShiftState } from '@/lib/shift-agent/types'

function baseState(over: Partial<CircadianState>): CircadianState {
  return {
    score: 50,
    status: 'Moderately aligned',
    trend: 'stable',
    trendDays: 7,
    sleepMidpointOffset: 2,
    sleepMidpointHistory: [
      { date: '2026-04-03', midpoint: '05:00', offset: 2 },
      { date: '2026-04-04', midpoint: '04:30', offset: 1.5 },
    ],
    consecutiveMisalignedDays: 2,
    consecutiveAlignedDays: 0,
    peakAlertnessTime: '12:00',
    lowEnergyTime: '02:00',
    adaptedPattern: false,
    adaptationDays: 0,
    scoreBreakdown: {
      baseScore: 78,
      driftPenalty: 6,
      recoveryBonus: 0,
      shiftFitBonus: 0,
      durationPenalty: 0,
      wakeGapPenalty: 0,
      maxInterSleepGapHours: null,
      goodGapStreakDays: 0,
      wakeGapDaysUntilClear: null,
    },
    forecast: { tomorrow: 52, threeDays: 48, sevenDays: 40, recoveryDays: 5 },
    lastCalculated: new Date(),
    dataQuality: 'good',
    recentAvgSleepHours: 7.5,
    ...over,
  }
}

describe('bodyClockCircadianUi', () => {
  it('forecast recovery line mentions days', () => {
    const line = buildForecastRecoveryLine({ tomorrow: 40, threeDays: 44, sevenDays: 50, recoveryDays: 3 })
    expect(line).toContain('3 days')
  })

  it('transition note when flipping to night', () => {
    const shift: Pick<UserShiftState, 'activeTransition'> = {
      activeTransition: {
        from: 'DAY',
        to: 'NIGHT',
        severity: 'moderate',
        napRecommended: false,
        sleepAnchorShift: 0,
        recoveryHours: 8,
        nextShiftStart: new Date('2026-04-09T18:00:00.000Z'),
        transitionStarted: new Date(),
      },
    }
    const note = buildTransitionForecastNote(shift as UserShiftState)
    expect(note).toBeTruthy()
    expect(note!.toLowerCase()).toContain('night')
  })

  it('takeaway for adapted pattern', () => {
    const text = buildTodaysTakeaway(baseState({ adaptedPattern: true, score: 20 }))
    expect(text.toLowerCase()).toContain('adapted')
  })

  it('habits for delayed offset emphasise morning light', () => {
    const bullets = buildCircadianHabitBullets(baseState({ sleepMidpointOffset: 3, adaptedPattern: false }))
    expect(bullets.some((b) => b.toLowerCase().includes('morning') || b.toLowerCase().includes('outdoor'))).toBe(true)
  })
})
