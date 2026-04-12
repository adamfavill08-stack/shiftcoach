import { addCalendarDaysToYmd } from '@/lib/sleep/utils'

export type ActivityBaselineStatus = 'insufficient_data' | 'well_below' | 'below' | 'near' | 'above'

export type ActivityReadinessHint = 'rest' | 'light_movement' | 'steady' | null

export type ActivityIntelligence = {
  /** Total steps attributed to the current anchored activity day (not midnight–midnight). */
  activityDaySteps: number
  /** YYYY-MM-DD label of the anchored activity day containing "now". */
  activityDayKey: string
  /** IANA zone used for bucketing (must match client `tz` when provided). */
  activityTimeZone: string
  baselineSteps: number | null
  baselineDaysUsed: number
  deltaVsBaseline: number | null
  activityStatus: ActivityBaselineStatus
  lowActivityDay: boolean
  readinessHint: ActivityReadinessHint
  readinessInsight: string | null
}

/** Past anchored days with step totals in this window inform the median baseline (excluding current day). */
export const ACTIVITY_BASELINE_LOOKBACK_DAYS = 14

/** Need at least this many past anchored days with steps > 0 to compute a baseline. */
export const ACTIVITY_BASELINE_MIN_DAYS = 1

function medianSorted(sorted: number[]): number {
  const n = sorted.length
  const m = Math.floor(n / 2)
  return n % 2 === 1 ? sorted[m]! : Math.round((sorted[m - 1]! + sorted[m]!) / 2)
}

/**
 * Rolling median of recent valid anchored days (steps > 0), current activity day excluded.
 * Day keys are shift-aware YYYY-MM-DD labels (see `activityDayKeyFromTimestamp`).
 * Ratio bands: <0.55 well below, <0.85 below, ≤1.15 near, else above.
 */
export function computeActivityIntelligence(params: {
  currentActivityDayKey: string
  stepsByActivityDay: Record<string, number>
  weeklyDeficitHours: number | null
  activityTimeZone: string
}): ActivityIntelligence {
  const { currentActivityDayKey, stepsByActivityDay, weeklyDeficitHours, activityTimeZone } = params
  const activityDaySteps = stepsByActivityDay[currentActivityDayKey] ?? 0

  const cutoff = addCalendarDaysToYmd(currentActivityDayKey, -ACTIVITY_BASELINE_LOOKBACK_DAYS)
  const pastSteps: number[] = []
  for (const [d, steps] of Object.entries(stepsByActivityDay)) {
    if (d >= currentActivityDayKey) continue
    if (d < cutoff) continue
    if (steps > 0) pastSteps.push(steps)
  }

  pastSteps.sort((a, b) => a - b)

  let baselineSteps: number | null = null
  if (pastSteps.length >= ACTIVITY_BASELINE_MIN_DAYS) {
    baselineSteps = medianSorted(pastSteps)
  }

  let activityStatus: ActivityBaselineStatus = 'insufficient_data'
  let deltaVsBaseline: number | null = null

  if (baselineSteps != null && baselineSteps > 0) {
    deltaVsBaseline = activityDaySteps - baselineSteps
    const ratio = activityDaySteps / baselineSteps
    if (ratio < 0.55) activityStatus = 'well_below'
    else if (ratio < 0.85) activityStatus = 'below'
    else if (ratio <= 1.15) activityStatus = 'near'
    else activityStatus = 'above'
  }

  const lowActivityDay =
    baselineSteps != null && baselineSteps >= 2000 && activityDaySteps < baselineSteps * 0.45

  let readinessHint: ActivityReadinessHint = null
  let readinessInsight: string | null = null

  if (baselineSteps != null && baselineSteps > 0) {
    const debt = weeklyDeficitHours
    if (debt != null && debt >= 5 && (activityStatus === 'well_below' || activityStatus === 'below')) {
      readinessHint = 'rest'
      readinessInsight =
        'Below your usual movement with elevated sleep debt—favour rest and easy days over pushing harder.'
    } else if (
      (debt == null || debt < 4) &&
      (activityStatus === 'well_below' || activityStatus === 'below') &&
      activityDaySteps < baselineSteps * 0.65
    ) {
      readinessHint = 'light_movement'
      readinessInsight =
        'Lower than typical steps—short walks or light pacing are enough if sleep has been reasonable.'
    } else {
      readinessHint = 'steady'
      readinessInsight = 'Movement looks sustainable relative to your recent pattern.'
    }
  }

  return {
    activityDaySteps,
    activityDayKey: currentActivityDayKey,
    activityTimeZone,
    baselineSteps,
    baselineDaysUsed: pastSteps.length,
    deltaVsBaseline,
    activityStatus,
    lowActivityDay,
    readinessHint,
    readinessInsight,
  }
}
