export type ShiftGuidanceShiftType =
  | 'day'
  | 'night'
  | 'evening'
  | 'early'
  | 'off'
  | 'transition'

export type ShiftGuidanceDayType =
  | 'normal'
  | 'transition_to_nights'
  | 'recovery_from_nights'
  | 'rest_day'
  | 'night_shift'
  | 'early_shift'

export type ShiftGuidanceRisk = 'low' | 'moderate' | 'high' | 'critical'
export type ShiftGuidanceRecommendationType =
  | 'sleep'
  | 'nap'
  | 'meal'
  | 'caffeine'
  | 'light'
  | 'hydration'
  | 'warning'
export type ShiftGuidanceUrgency = 'low' | 'medium' | 'high'

export type ShiftGuidanceMealState = {
  breakfast: boolean
}

export type ShiftGuidanceUserPreferences = {
  chronotype?: 'morning' | 'intermediate' | 'evening' | null
  preferredNapMinutes?: number | null
  caffeineCutoffHoursBeforeSleep?: number | null
}

export type ShiftGuidanceInput = {
  now: Date
  lastSleepEnd: Date | null
  nextPlannedSleepStart: Date | null
  nextShiftStart: Date | null
  nextShiftEnd: Date | null
  shiftType: ShiftGuidanceShiftType
  sleepDurationHours: number | null
  sleepDebtHours: number
  mealsLogged: ShiftGuidanceMealState
  caffeineLogged: number
  userPreferences?: ShiftGuidanceUserPreferences
}

export type ShiftGuidanceRecommendation = {
  type: ShiftGuidanceRecommendationType
  urgency: ShiftGuidanceUrgency
  reason: string
  suggestedWindow: string
}

export type DailyShiftGuidance = {
  fatigueRisk: ShiftGuidanceRisk
  dayType: ShiftGuidanceDayType
  primaryRecommendation: string
  recommendations: ShiftGuidanceRecommendation[]
  timeAwakeHours: number | null
  projectedAwakeHours: number | null
}

const HOUR = 60 * 60 * 1000

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtWindow(start: Date, end: Date): string {
  return `${fmtTime(start)}-${fmtTime(end)}`
}

function addRec(
  out: ShiftGuidanceRecommendation[],
  rec: ShiftGuidanceRecommendation,
) {
  out.push(rec)
}

function inferDayType(input: ShiftGuidanceInput): ShiftGuidanceDayType {
  if (input.shiftType === 'off') return 'rest_day'
  if (input.shiftType === 'early') return 'early_shift'
  if (input.shiftType === 'night') return 'night_shift'
  if (input.shiftType === 'transition') return 'transition_to_nights'
  return 'normal'
}

function inferFatigueRisk(projectedAwakeHours: number | null, sleepDebtHours: number): ShiftGuidanceRisk {
  if (projectedAwakeHours == null) {
    if (sleepDebtHours >= 8) return 'high'
    if (sleepDebtHours >= 4) return 'moderate'
    return 'low'
  }

  if (projectedAwakeHours >= 22) return 'critical'
  if (projectedAwakeHours >= 18) return 'high'
  if (projectedAwakeHours >= 14) return 'moderate'
  if (sleepDebtHours >= 8) return 'high'
  if (sleepDebtHours >= 4) return 'moderate'
  return 'low'
}

export function generateDailyShiftGuidance(input: ShiftGuidanceInput): DailyShiftGuidance {
  const {
    now,
    lastSleepEnd,
    nextPlannedSleepStart,
    nextShiftStart,
    nextShiftEnd,
    shiftType,
    sleepDurationHours,
    sleepDebtHours,
    mealsLogged,
    caffeineLogged,
    userPreferences,
  } = input

  const recs: ShiftGuidanceRecommendation[] = []
  const dayType = inferDayType(input)
  const timeAwakeHours =
    lastSleepEnd != null ? Math.max(0, (now.getTime() - lastSleepEnd.getTime()) / HOUR) : null
  const projectedAwakeHours =
    lastSleepEnd != null && nextPlannedSleepStart != null
      ? Math.max(0, (nextPlannedSleepStart.getTime() - lastSleepEnd.getTime()) / HOUR)
      : null

  const fatigueRisk = inferFatigueRisk(projectedAwakeHours, sleepDebtHours)
  const caffeineCutoff = userPreferences?.caffeineCutoffHoursBeforeSleep ?? 7

  if (projectedAwakeHours != null && projectedAwakeHours >= 18) {
    addRec(recs, {
      type: 'warning',
      urgency: projectedAwakeHours >= 20 ? 'high' : 'medium',
      reason: `Projected awake time is ${projectedAwakeHours.toFixed(1)}h before next planned sleep.`,
      suggestedWindow: 'Now',
    })
  }

  if (projectedAwakeHours != null && projectedAwakeHours >= 20) {
    const napStart = nextShiftStart
      ? new Date(Math.max(now.getTime(), nextShiftStart.getTime() - 6 * HOUR))
      : new Date(now.getTime() + 2 * HOUR)
    const napEnd = nextShiftStart
      ? new Date(Math.max(napStart.getTime() + HOUR, nextShiftStart.getTime() - 3 * HOUR))
      : new Date(napStart.getTime() + 3 * HOUR)
    const napMinutes = clamp(userPreferences?.preferredNapMinutes ?? 90, 20, 120)
    addRec(recs, {
      type: 'nap',
      urgency: 'high',
      reason: `Projected awake time exceeds 20h; a ${napMinutes}-minute nap lowers fatigue risk.`,
      suggestedWindow: fmtWindow(napStart, napEnd),
    })
  }

  if (dayType === 'transition_to_nights' && lastSleepEnd) {
    const wokeMorning = lastSleepEnd.getHours() <= 11
    if (wokeMorning) {
      const napStart = new Date(now)
      napStart.setHours(14, 0, 0, 0)
      const napEnd = new Date(now)
      napEnd.setHours(17, 0, 0, 0)
      addRec(recs, {
        type: 'nap',
        urgency: 'high',
        reason: 'Transitioning from days to nights after a morning wake increases total awake load.',
        suggestedWindow: fmtWindow(napStart, napEnd),
      })
    }
  }

  if (lastSleepEnd && timeAwakeHours != null && timeAwakeHours <= 2 && !mealsLogged.breakfast) {
    const end = new Date(lastSleepEnd.getTime() + 2 * HOUR)
    addRec(recs, {
      type: 'meal',
      urgency: 'high',
      reason: 'You woke recently and no breakfast is logged; early fueling helps stabilize energy.',
      suggestedWindow: fmtWindow(lastSleepEnd, end),
    })
  }

  if (shiftType === 'night' || dayType === 'transition_to_nights') {
    if (lastSleepEnd && lastSleepEnd.getHours() <= 11) {
      addRec(recs, {
        type: 'meal',
        urgency: 'medium',
        reason: 'For night shifts, breakfast after waking supports alertness and appetite rhythm.',
        suggestedWindow: fmtWindow(lastSleepEnd, new Date(lastSleepEnd.getTime() + 2 * HOUR)),
      })
    }
    if (nextShiftStart) {
      addRec(recs, {
        type: 'meal',
        urgency: 'high',
        reason: 'A main pre-shift meal reduces overnight hunger and energy dips.',
        suggestedWindow: fmtWindow(new Date(nextShiftStart.getTime() - 2 * HOUR), new Date(nextShiftStart.getTime() - 30 * 60 * 1000)),
      })
      addRec(recs, {
        type: 'meal',
        urgency: 'medium',
        reason: 'A lighter meal/snack mid-shift supports sustained performance.',
        suggestedWindow: fmtWindow(new Date(nextShiftStart.getTime() + 3 * HOUR), new Date(nextShiftStart.getTime() + 6 * HOUR)),
      })
    }
    if (nextPlannedSleepStart) {
      addRec(recs, {
        type: 'meal',
        urgency: 'medium',
        reason: 'Avoid heavy meals close to planned sleep to protect sleep onset and quality.',
        suggestedWindow: `Avoid heavy meals within ${fmtWindow(new Date(nextPlannedSleepStart.getTime() - 3 * HOUR), nextPlannedSleepStart)}`,
      })
    }
  }

  if (nextShiftStart && nextShiftEnd) {
    const firstHalfEnd = new Date((nextShiftStart.getTime() + nextShiftEnd.getTime()) / 2)
    addRec(recs, {
      type: 'caffeine',
      urgency: 'medium',
      reason: 'Caffeine is most useful in the first half of the shift/awake window.',
      suggestedWindow: fmtWindow(nextShiftStart, firstHalfEnd),
    })
  }
  if (nextPlannedSleepStart) {
    addRec(recs, {
      type: 'warning',
      urgency: 'medium',
      reason: `Avoid caffeine within ${caffeineCutoff}-${Math.round(caffeineCutoff + 1)}h of planned sleep.`,
      suggestedWindow: `Cutoff by ${fmtTime(new Date(nextPlannedSleepStart.getTime() - caffeineCutoff * HOUR))}`,
    })
  }

  if (shiftType === 'night' && nextShiftStart && nextShiftEnd) {
    const firstHalfEnd = new Date((nextShiftStart.getTime() + nextShiftEnd.getTime()) / 2)
    addRec(recs, {
      type: 'light',
      urgency: 'medium',
      reason: 'Bright light before and early in a night shift improves alertness.',
      suggestedWindow: fmtWindow(new Date(nextShiftStart.getTime() - HOUR), firstHalfEnd),
    })
    addRec(recs, {
      type: 'light',
      urgency: 'medium',
      reason: 'Reducing light near shift end helps sleep readiness after work.',
      suggestedWindow: fmtWindow(new Date(nextShiftEnd.getTime() - 2 * HOUR), new Date(nextShiftEnd.getTime() + HOUR)),
    })
  }

  addRec(recs, {
    type: 'hydration',
    urgency: 'low',
    reason: 'Steady hydration supports alertness and reduces perceived fatigue.',
    suggestedWindow: 'Across the full awake window',
  })

  let primaryRecommendation = 'Keep a stable sleep, meal, and light routine today.'
  if (fatigueRisk === 'critical' && projectedAwakeHours != null) {
    primaryRecommendation = `Today is a high-strain day: projected awake time is ${projectedAwakeHours.toFixed(
      1,
    )}h. Prioritize a nap before your next shift.`
  } else if (dayType === 'transition_to_nights') {
    primaryRecommendation =
      'Transition day to nights: plan an afternoon nap, fuel early, and front-load alertness strategies.'
  } else if (shiftType === 'night') {
    primaryRecommendation =
      'Night-shift plan: pre-shift meal, strategic caffeine early, bright light first half, and wind-down near end.'
  } else if (sleepDurationHours != null && sleepDurationHours < 6) {
    primaryRecommendation =
      'Sleep was short; keep intensity moderate, hydrate, and schedule a recovery sleep opportunity.'
  }

  return {
    fatigueRisk,
    dayType,
    primaryRecommendation,
    recommendations: recs,
    timeAwakeHours,
    projectedAwakeHours,
  }
}

