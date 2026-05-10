import type { SupabaseClient } from '@supabase/supabase-js'
import { isoLocalDate } from '@/lib/shifts'
import {
  applyHolidayAsOffToShiftRows,
  fetchHolidayLocalDatesSet,
} from '@/lib/rota/holidayRotaPriority'
import { toShiftType, type StandardShiftType } from '@/lib/shifts/toShiftType'
import type {
  GuidanceMode,
  OperationalShiftKind,
  ShiftContextResult,
  ShiftContextSnapshot,
  TransitionState,
} from '@/lib/shift-context/types'
import { inferOffDayContext, inferOffDayNightAnchor } from '@/lib/shift-context/inferOffDayContext'

export type ShiftRowInput = {
  date: string
  label?: string | null
  start_ts?: string | null
  end_ts?: string | null
}

const BUFFER_MS = 60 * 60 * 1000
const PRIMARY_HORIZON_MS = 12 * 60 * 60 * 1000
const MEAL_24_MS = 24 * 60 * 60 * 1000
const MEAL_48_MS = 48 * 60 * 60 * 1000
const POST_NIGHT_RECOVERY_H = 24

export function operationalKindFromStandard(
  standard: StandardShiftType,
  label?: string | null,
): OperationalShiftKind {
  const L = (label ?? '').toUpperCase().trim()
  if (L === 'EARLY') return 'early'
  if (L === 'LATE') return 'late'
  if (standard === 'off') return 'off'
  if (standard === 'night') return 'night'
  if (standard === 'morning') return 'early'
  if (standard === 'evening') return 'late'
  if (standard === 'day') return 'day'
  return 'other'
}

/** Wall-clock interval for a rota row (explicit timestamps or label-based estimate). Exported for sleep-plan and other pure consumers. */
export function estimateShiftRowBounds(
  row: ShiftRowInput,
  _now: Date = new Date(),
): { start: Date; end: Date; usedEstimatedTimes: boolean } {
  if (row.start_ts && row.end_ts) {
    return { start: new Date(row.start_ts), end: new Date(row.end_ts), usedEstimatedTimes: false }
  }
  const standard = toShiftType(row.label, row.start_ts)
  const anchor = new Date(`${row.date}T12:00:00`)
  let start = new Date(anchor)
  let end = new Date(anchor)

  if (standard === 'off') {
    start = new Date(`${row.date}T00:00:00`)
    end = new Date(`${row.date}T23:59:59`)
    return { start, end, usedEstimatedTimes: true }
  }

  if (standard === 'night') {
    start = new Date(anchor)
    start.setHours(22, 0, 0, 0)
    end = new Date(start.getTime() + 9 * 60 * 60 * 1000)
    return { start, end, usedEstimatedTimes: true }
  }

  if (standard === 'evening') {
    start = new Date(anchor)
    start.setHours(15, 0, 0, 0)
    end = new Date(anchor)
    end.setHours(23, 0, 0, 0)
    return { start, end, usedEstimatedTimes: true }
  }

  if (standard === 'morning') {
    start = new Date(anchor)
    start.setHours(6, 0, 0, 0)
    end = new Date(anchor)
    end.setHours(14, 0, 0, 0)
    return { start, end, usedEstimatedTimes: true }
  }

  /* day + default */
  start = new Date(anchor)
  start.setHours(9, 0, 0, 0)
  end = new Date(anchor)
  end.setHours(17, 0, 0, 0)
  return { start, end, usedEstimatedTimes: true }
}

type Internal = ShiftRowInput & {
  start: Date
  end: Date
  standardType: StandardShiftType
  operationalKind: OperationalShiftKind
  usedEstimatedTimes: boolean
}

function toSnapshot(
  row: Internal,
  now: Date,
  opts: { isActive: boolean },
): ShiftContextSnapshot {
  const msUntil = row.start.getTime() - now.getTime()
  const hoursUntilStart = msUntil > 0 ? msUntil / (1000 * 60 * 60) : null
  return {
    rotaDate: row.date,
    label: row.label ?? null,
    standardType: row.standardType,
    operationalKind: row.operationalKind,
    startTs: row.start_ts && row.end_ts ? row.start_ts : row.start.toISOString(),
    endTs: row.start_ts && row.end_ts ? row.end_ts : row.end.toISOString(),
    isActive: opts.isActive,
    hoursUntilStart,
    usedEstimatedTimes: row.usedEstimatedTimes,
  }
}

function isWorkKind(k: OperationalShiftKind): boolean {
  return k !== 'off' && k !== 'other'
}

function kindCluster(k: OperationalShiftKind): 'night' | 'dayish' | 'off' {
  if (k === 'night') return 'night'
  if (k === 'off' || k === 'other') return 'off'
  return 'dayish'
}

/**
 * Pure resolver for tests and server reuse.
 */
export function resolveShiftContextFromRows(rows: ShiftRowInput[], now: Date = new Date()): ShiftContextResult {
  const internal: Internal[] = (rows ?? []).map((r) => {
    const { start, end, usedEstimatedTimes } = estimateShiftRowBounds(r, now)
    const standardType = toShiftType(r.label, r.start_ts ?? null)
    const operationalKind = operationalKindFromStandard(standardType, r.label)
    return {
      ...r,
      start,
      end,
      standardType,
      operationalKind,
      usedEstimatedTimes,
    }
  })

  internal.sort((a, b) => a.start.getTime() - b.start.getTime())

  const active = internal.find(
    (s) =>
      isWorkKind(s.operationalKind) &&
      now.getTime() >= s.start.getTime() - BUFFER_MS &&
      now.getTime() <= s.end.getTime() + BUFFER_MS,
  )

  const activeOff = internal.find(
    (s) =>
      s.operationalKind === 'off' &&
      now.getTime() >= s.start.getTime() &&
      now.getTime() <= s.end.getTime(),
  )

  const currentShiftRaw = active ?? (activeOff && !active ? activeOff : null)

  const completed = internal.filter((s) => s.end.getTime() < now.getTime())
  const lastCompleted =
    completed.length > 0
      ? completed.reduce((a, b) => (a.end.getTime() >= b.end.getTime() ? a : b))
      : null

  const upcoming = internal.filter((s) => s.start.getTime() > now.getTime())
  const nextShiftRaw = upcoming.length ? upcoming[0] : null

  let primaryRaw: Internal | null = null
  if (currentShiftRaw && isWorkKind(currentShiftRaw.operationalKind)) {
    primaryRaw = currentShiftRaw
  } else if (nextShiftRaw && isWorkKind(nextShiftRaw.operationalKind)) {
    const until = nextShiftRaw.start.getTime() - now.getTime()
    if (until >= 0 && until <= PRIMARY_HORIZON_MS) {
      primaryRaw = nextShiftRaw
    }
  }

  let mealRaw: Internal | null = primaryRaw
  if (!mealRaw) {
    const in24 = upcoming.find(
      (s) =>
        isWorkKind(s.operationalKind) &&
        s.start.getTime() - now.getTime() <= MEAL_24_MS &&
        s.start.getTime() > now.getTime(),
    )
    mealRaw = in24 ?? null
  }
  if (!mealRaw) {
    const in48 = upcoming.find(
      (s) =>
        isWorkKind(s.operationalKind) &&
        s.start.getTime() - now.getTime() <= MEAL_48_MS &&
        s.start.getTime() > now.getTime(),
    )
    mealRaw = in48 ?? null
  }
  if (!mealRaw && activeOff) {
    mealRaw = activeOff
  }

  const lastCompletedShift = lastCompleted
    ? toSnapshot(lastCompleted, now, { isActive: false })
    : null
  const currentShift = currentShiftRaw
    ? toSnapshot(currentShiftRaw, now, {
        isActive:
          currentShiftRaw === active ||
          (currentShiftRaw === activeOff && active == null),
      })
    : null
  const nextShift = nextShiftRaw ? toSnapshot(nextShiftRaw, now, { isActive: false }) : null

  const primaryOperationalShift = primaryRaw ? toSnapshot(primaryRaw, now, { isActive: primaryRaw === active }) : null

  const mealPlanningShift = mealRaw ? toSnapshot(mealRaw, now, { isActive: mealRaw === active }) : null

  const transitionState = inferTransitionState({
    now,
    lastCompleted,
    mealRaw,
    primaryRaw,
    currentShiftRaw,
  })

  const guidanceMode = inferGuidanceMode({
    now,
    active,
    activeOff,
    primaryRaw,
    mealRaw,
    lastCompleted,
    transitionState,
  })

  const offDayContext = inferOffDayContext(
    { guidanceMode, lastCompletedShift, nextShift },
    now,
  )
  const offDayNightAnchor = inferOffDayNightAnchor(
    { nextShift, mealPlanningShift },
    offDayContext,
  )

  return {
    lastCompletedShift,
    currentShift,
    nextShift,
    primaryOperationalShift,
    mealPlanningShift,
    transitionState,
    guidanceMode,
    offDayContext,
    offDayNightAnchor,
  }
}

function inferTransitionState(args: {
  now: Date
  lastCompleted: Internal | null
  mealRaw: Internal | null
  primaryRaw: Internal | null
  currentShiftRaw: Internal | null
}): TransitionState {
  const { now, lastCompleted, mealRaw, primaryRaw, currentShiftRaw } = args

  if (mealRaw?.operationalKind === 'off') return 'off_day'

  const lastKind = lastCompleted ? kindCluster(lastCompleted.operationalKind) : null
  const target = mealRaw ?? primaryRaw
  const targetCluster = target ? kindCluster(target.operationalKind) : null

  if (lastKind === 'night' && targetCluster === 'dayish') {
    const hoursSinceNight =
      lastCompleted && lastCompleted.standardType === 'night'
        ? (now.getTime() - lastCompleted.end.getTime()) / (1000 * 60 * 60)
        : 999
    if (!currentShiftRaw && hoursSinceNight >= 0 && hoursSinceNight < POST_NIGHT_RECOVERY_H && !primaryRaw) {
      return 'post_night_recovery'
    }
    return 'night_to_day'
  }

  if (
    (lastKind === 'dayish' || lastKind === 'off') &&
    targetCluster === 'night' &&
    lastCompleted?.standardType !== 'night'
  ) {
    return 'day_to_night'
  }

  if (!target && lastKind === 'off') return 'off_day'

  return 'stable'
}

function inferGuidanceMode(args: {
  now: Date
  active: Internal | undefined
  activeOff: Internal | undefined
  primaryRaw: Internal | null
  mealRaw: Internal | null
  lastCompleted: Internal | null
  transitionState: TransitionState
}): GuidanceMode {
  const { active, activeOff, primaryRaw, mealRaw, lastCompleted, transitionState } = args

  if (active && active.operationalKind === 'night') return 'night_shift'
  if (active && isWorkKind(active.operationalKind) && active.operationalKind !== 'night') {
    return 'day_shift'
  }
  if (activeOff && !active) return 'off_day'

  if (primaryRaw) {
    if (primaryRaw.operationalKind === 'night') {
      return transitionState === 'day_to_night' ? 'transition_day_to_night' : 'pre_night_shift'
    }
    return transitionState === 'night_to_day' ? 'transition_night_to_day' : 'pre_day_shift'
  }

  if (transitionState === 'post_night_recovery') return 'recovery_after_night'
  if (transitionState === 'off_day') return 'off_day'
  if (!primaryRaw && mealRaw?.operationalKind === 'night' && transitionState === 'day_to_night') {
    return 'transition_day_to_night'
  }
  if (mealRaw?.operationalKind === 'night') return 'pre_night_shift'
  if (mealRaw && isWorkKind(mealRaw.operationalKind)) return 'pre_day_shift'

  if (lastCompleted?.standardType === 'night') return 'recovery_after_night'

  return 'off_day'
}

export async function fetchShiftContext(
  supabase: { from: (t: string) => any },
  userId: string,
  now: Date = new Date(),
): Promise<ShiftContextResult> {
  const start = new Date(now)
  start.setDate(start.getDate() - 2)
  const end = new Date(now)
  end.setDate(end.getDate() + 3)
  const from = isoLocalDate(start)
  const to = isoLocalDate(end)

  const { data, error } = await supabase
    .from('shifts')
    .select('date,label,start_ts,end_ts')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (error) {
    console.warn('[fetchShiftContext] shifts query failed:', error.message)
    return resolveShiftContextFromRows([], now)
  }

  const holidayDates = await fetchHolidayLocalDatesSet(supabase as SupabaseClient, userId, from, to)
  const rows = applyHolidayAsOffToShiftRows((data ?? []) as ShiftRowInput[], holidayDates)
  return resolveShiftContextFromRows(rows, now)
}
