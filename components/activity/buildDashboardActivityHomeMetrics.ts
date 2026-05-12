'use client'

import type { IntensityBreakdown } from '@/lib/activity/calculateIntensityBreakdown'
import type { ActivityToday } from '@/lib/hooks/useActivityToday'
import { getActivityDayStepsFromTodayApi } from '@/lib/hooks/useActivityToday'
import { formatYmdInTimeZone } from '@/lib/sleep/utils'
import {
  buildAdaptiveMovementData,
  buildEmptyShiftMovementData,
  type Shift,
  type StepSample,
} from '@/components/activity/AdaptiveMovementCard'

const defaultIntensity: IntensityBreakdown = {
  light: { minutes: 0, target: 10 },
  moderate: { minutes: 0, target: 15 },
  vigorous: { minutes: 0, target: 5 },
  totalActiveMinutes: 0,
}

export type DashboardActivityHomeMetrics = {
  heroSteps: number
  activeMinutes: number
  caloriesBurned: number
  /** Same roster split as “Your shift movement”; only meaningful on shift days. */
  duringShiftSteps: number | null
  showDuringShiftRow: boolean
  goal: number
}

/**
 * Dashboard home “Activity” tile: civil-midnight hero totals + optional during-shift steps
 * (aligned with {@link buildAdaptiveMovementData} on the activity page).
 */
export function buildDashboardActivityHomeMetrics(
  data: ActivityToday,
  loading: boolean,
): DashboardActivityHomeMetrics {
  const goal = data.adaptedStepGoal ?? data.goal ?? data.stepTarget ?? 9000

  if (loading) {
    return {
      heroSteps: 0,
      activeMinutes: 0,
      caloriesBurned: 0,
      duringShiftSteps: null,
      showDuringShiftRow: false,
      goal,
    }
  }

  const intel = data.activityIntelligence
  const heroCivil = data.heroCivilCalendarDay
  const chartDaySteps = intel?.activityDaySteps ?? data.steps ?? 0

  const heroSteps =
    heroCivil != null && typeof heroCivil.steps === 'number'
      ? Math.max(0, Math.round(heroCivil.steps))
      : chartDaySteps

  const heroIntensity: IntensityBreakdown =
    heroCivil?.intensityBreakdown ?? data.intensityBreakdown ?? defaultIntensity

  const activeMinutes = Math.round(
    heroCivil != null
      ? heroIntensity.totalActiveMinutes > 0
        ? heroIntensity.totalActiveMinutes
        : heroCivil.activeMinutes ?? 0
      : heroIntensity.totalActiveMinutes > 0
        ? heroIntensity.totalActiveMinutes
        : Math.max(0, Math.round(data.activeMinutes ?? 0)),
  )

  const caloriesBurned = Math.max(
    0,
    Math.round(
      heroCivil != null && typeof heroCivil.estimatedCaloriesBurned === 'number'
        ? heroCivil.estimatedCaloriesBurned
        : data.estimatedCaloriesBurned ?? 0,
    ),
  )

  const shiftTypeValue = data.shiftType
  const isShiftDay = shiftTypeValue === 'day' || shiftTypeValue === 'night' || shiftTypeValue === 'late'
  const isRecoveryDay = !isShiftDay && (data.recoverySignal === 'RED' || data.recoverySignal === 'AMBER')
  const dayType = isShiftDay ? 'shift' : isRecoveryDay ? 'recovery' : 'day_off'

  const parsedShiftStart = data.shiftStart ? Date.parse(data.shiftStart) : NaN
  const parsedShiftEnd = data.shiftEnd ? Date.parse(data.shiftEnd) : NaN
  const shift: Shift | null =
    dayType === 'shift' && Number.isFinite(parsedShiftStart) && Number.isFinite(parsedShiftEnd)
      ? {
          start: data.shiftStart as string,
          end: data.shiftEnd as string,
          type:
            shiftTypeValue === 'day'
              ? 'day'
              : shiftTypeValue === 'night'
                ? 'night'
                : shiftTypeValue === 'late'
                  ? 'evening'
                  : 'unknown',
        }
      : null

  const showDuringShiftRow = dayType === 'shift' && shift != null

  let duringShiftSteps: number | null = null
  if (showDuringShiftRow && shift) {
    const samples: StepSample[] = Array.isArray(data.stepSamples)
      ? data.stepSamples.map((sample) => ({
          timestamp: sample.timestamp,
          steps: Math.max(0, Math.round(sample.steps || 0)),
          endTimestamp:
            sample && typeof sample === 'object' && 'endTimestamp' in sample
              ? (sample as { endTimestamp?: string | null }).endTimestamp ?? null
              : null,
        }))
      : []

    const activityTimeZone =
      typeof intel?.activityTimeZone === 'string' && intel.activityTimeZone.trim()
        ? intel.activityTimeZone.trim()
        : Intl.DateTimeFormat().resolvedOptions().timeZone

    const hourlyCivilBuckets =
      data.stepsByHourAnchorStart == null &&
      Array.isArray(data.stepsByHour) &&
      data.stepsByHour.length === 24
        ? data.stepsByHour
        : null

    const hourlyShiftAnchoredBuckets =
      data.stepsByHourAnchorStart != null &&
      Array.isArray(data.stepsByHour) &&
      data.stepsByHour.length === 24
        ? data.stepsByHour
        : null

    const stepsByHourAnchorStart =
      typeof data.stepsByHourAnchorStart === 'string' && data.stepsByHourAnchorStart.trim()
        ? data.stepsByHourAnchorStart.trim()
        : null

    const coherentStepsFallback = getActivityDayStepsFromTodayApi(data)
    const nowForDistribution = new Date()

    const activityDateYmd =
      dayType === 'shift' &&
      typeof data.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(data.date.trim())
        ? data.date.trim().slice(0, 10)
        : typeof activityTimeZone === 'string' && activityTimeZone.trim()
          ? formatYmdInTimeZone(nowForDistribution, activityTimeZone.trim())
          : typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(data.date)
            ? data.date.slice(0, 10)
            : null

    const adaptiveOpts = {
      samples,
      dayType,
      shift,
      activityTimeZone,
      hourlyCivilBuckets,
      hourlyShiftAnchoredBuckets,
      stepsByHourAnchorStart,
      activityDateYmd,
      coherentStepsFallback,
      nowForDistribution,
      movementAfterShiftSleepWindowStartIso: data.movementAfterShiftSleepWindowStartIso ?? null,
    } as const

    try {
      const adaptive = buildAdaptiveMovementData(adaptiveOpts)
      duringShiftSteps = adaptive.mode === 'shift' ? Math.max(0, Math.round(adaptive.segments.during)) : 0
    } catch {
      const empty = buildEmptyShiftMovementData()
      duringShiftSteps = empty.mode === 'shift' ? Math.max(0, Math.round(empty.segments.during)) : 0
    }
  }

  return {
    heroSteps,
    activeMinutes,
    caloriesBurned,
    duringShiftSteps,
    showDuringShiftRow,
    goal,
  }
}
