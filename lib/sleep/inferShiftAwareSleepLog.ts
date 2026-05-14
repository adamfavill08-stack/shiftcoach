import { estimateShiftRowBounds, type ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import { toShiftType } from '@/lib/shifts/toShiftType'
import { formatYmdInTimeZone } from '@/lib/sleep/utils'
import { isNightLikeInstant } from '@/lib/sleep/sleepShiftWallClock'
import type { SleepType } from '@/lib/sleep/types'

type ShiftInstantWithRow = {
  row: ShiftRowInput
  label: string
  date: string
  startMs: number
  endMs: number
}

export type ShiftAwareSleepLogSuggestion = {
  suggestedType: SleepType
  reason: 'post_night' | 'post_shift' | 'pre_night_nap' | 'nap_length' | 'main_sleep'
  linkedShift: {
    label: string
    date: string
    startAt: string
    endAt: string
  } | null
  nextShift: {
    label: string
    date: string
    startAt: string
  } | null
  warning: 'overlaps_shift' | 'off_day_after_night' | null
}

const MS_MIN = 60_000
const MS_H = 60 * MS_MIN

function isWorkRow(row: ShiftRowInput): boolean {
  return toShiftType(row.label, row.start_ts ?? null) !== 'off'
}

function buildWorkInstants(shifts: ShiftRowInput[], timeZone: string): ShiftInstantWithRow[] {
  return (shifts ?? [])
    .filter((row) => row?.date && isWorkRow(row))
    .map((row) => {
      const { start, end } = estimateShiftRowBounds(row, new Date(), timeZone)
      return {
        row,
        label: row.label || 'WORK',
        date: row.date,
        startMs: start.getTime(),
        endMs: end.getTime(),
      }
    })
    .filter((shift) => Number.isFinite(shift.startMs) && Number.isFinite(shift.endMs) && shift.endMs > shift.startMs)
    .sort((a, b) => a.startMs - b.startMs)
}

function findOffRowOnWakeDayAfterNight(
  shifts: ShiftRowInput[],
  wakeYmd: string,
  anchor: ShiftInstantWithRow | null,
  timeZone: string,
): boolean {
  if (!anchor || !isNightLikeInstant(anchor, timeZone)) return false
  return shifts.some((row) => {
    if (String(row.date ?? '').slice(0, 10) !== wakeYmd) return false
    return toShiftType(row.label, row.start_ts ?? null) === 'off'
  })
}

export function inferShiftAwareSleepLog(input: {
  startAt: string | Date
  endAt: string | Date
  shifts?: ShiftRowInput[]
  timeZone?: string | null
}): ShiftAwareSleepLogSuggestion {
  const timeZone = input.timeZone?.trim() || 'UTC'
  const startMs = new Date(input.startAt).getTime()
  const endMs = new Date(input.endAt).getTime()
  const durationMs = endMs - startMs

  const fallback: ShiftAwareSleepLogSuggestion = {
    suggestedType: 'main_sleep',
    reason: 'main_sleep',
    linkedShift: null,
    nextShift: null,
    warning: null,
  }

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return fallback

  const shifts = input.shifts ?? []
  const instants = buildWorkInstants(shifts, timeZone)
  const overlapsShift = instants.some((s) => s.startMs < endMs && s.endMs > startMs)

  const endedBeforeSleep = instants
    .filter((s) => s.endMs <= startMs + 45 * MS_MIN)
    .sort((a, b) => b.endMs - a.endMs)

  const nightAnchor =
    endedBeforeSleep.find(
      (s) =>
        isNightLikeInstant(s, timeZone) &&
        startMs - s.endMs >= -45 * MS_MIN &&
        startMs - s.endMs <= 14 * MS_H,
    ) ?? null

  const recentShift =
    nightAnchor ??
    endedBeforeSleep.find((s) => startMs - s.endMs >= -45 * MS_MIN && startMs - s.endMs <= 6 * MS_H) ??
    null

  const nextShift =
    instants.find((s) => s.startMs >= endMs && s.startMs - endMs <= 18 * MS_H) ?? null
  const nextNight =
    nextShift && isNightLikeInstant(nextShift, timeZone) ? nextShift : null

  let suggestedType: SleepType = 'main_sleep'
  let reason: ShiftAwareSleepLogSuggestion['reason'] = 'main_sleep'
  const durationMinutes = durationMs / MS_MIN

  if (nightAnchor) {
    suggestedType = 'post_shift_sleep'
    reason = 'post_night'
  } else if (recentShift) {
    suggestedType = 'post_shift_sleep'
    reason = 'post_shift'
  } else if (nextNight && durationMinutes <= 180) {
    suggestedType = 'nap'
    reason = 'pre_night_nap'
  } else if (durationMinutes <= 180) {
    suggestedType = 'nap'
    reason = 'nap_length'
  }

  const wakeYmd = formatYmdInTimeZone(new Date(endMs), timeZone)
  const offAfterNight = findOffRowOnWakeDayAfterNight(shifts, wakeYmd, nightAnchor, timeZone)

  const linkedShift = recentShift
    ? {
        label: recentShift.label,
        date: recentShift.date,
        startAt: new Date(recentShift.startMs).toISOString(),
        endAt: new Date(recentShift.endMs).toISOString(),
      }
    : null

  return {
    suggestedType,
    reason,
    linkedShift,
    nextShift: nextShift
      ? {
          label: nextShift.label,
          date: nextShift.date,
          startAt: new Date(nextShift.startMs).toISOString(),
        }
      : null,
    warning: overlapsShift ? 'overlaps_shift' : offAfterNight ? 'off_day_after_night' : null,
  }
}
