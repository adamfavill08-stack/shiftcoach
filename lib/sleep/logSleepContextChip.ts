import type { ShiftAwareSleepLogSuggestion } from '@/lib/sleep/inferShiftAwareSleepLog'
import type { ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import { formatYmdInTimeZone } from '@/lib/sleep/utils'
import { toShiftType } from '@/lib/shifts/toShiftType'

export type LogSleepContextChip = {
  i18nKey: string
  params?: Record<string, string>
}

function rowForLocalYmd(ymd: string, rows: ShiftRowInput[] | undefined): ShiftRowInput | null {
  if (!rows?.length) return null
  for (const r of rows) {
    if (String(r?.date ?? '').slice(0, 10) === ymd) return r
  }
  return null
}

function wakeCivilDayIsOff(endAt: Date, timeZone: string, rows: ShiftRowInput[] | undefined): boolean {
  const ymd = formatYmdInTimeZone(endAt, timeZone)
  const row = rowForLocalYmd(ymd, rows)
  if (!row) return false
  return toShiftType(row.label, row.start_ts ?? null) === 'off'
}

/**
 * Small contextual line under the log-sleep title, from rota + preview only (no fake data).
 */
export function resolveLogSleepContextChip(input: {
  previewEnd: Date
  rotaSuggestion: ShiftAwareSleepLogSuggestion | null
  shiftRows?: ShiftRowInput[]
  timeZone: string
}): LogSleepContextChip | null {
  const { previewEnd, rotaSuggestion, shiftRows, timeZone } = input
  if (!rotaSuggestion) return null

  const tz = (timeZone ?? 'UTC').trim() || 'UTC'

  if (wakeCivilDayIsOff(previewEnd, tz, shiftRows) && (rotaSuggestion.reason === 'post_night' || rotaSuggestion.reason === 'post_shift')) {
    return { i18nKey: 'sleepLog.contextChip.dayOffRecovery' }
  }

  if (rotaSuggestion.reason === 'post_night' && rotaSuggestion.linkedShift) {
    return {
      i18nKey: 'sleepLog.contextChip.afterShift',
      params: { label: String(rotaSuggestion.linkedShift.label ?? '').trim() || 'Night' },
    }
  }

  if (rotaSuggestion.reason === 'pre_night_nap') {
    return { i18nKey: 'sleepLog.contextChip.beforeNightShift' }
  }

  if (rotaSuggestion.reason === 'post_shift' && rotaSuggestion.linkedShift) {
    return {
      i18nKey: 'sleepLog.contextChip.afterShift',
      params: { label: String(rotaSuggestion.linkedShift.label ?? '').trim() || 'Shift' },
    }
  }

  const next = rotaSuggestion.nextShift
  if (next) {
    const nextType = toShiftType(next.label, next.startAt)
    const labelUp = String(next.label ?? '').toUpperCase()
    const isEarlyLike = nextType === 'morning' || labelUp.includes('EARLY')
    const nextStartMs = Date.parse(next.startAt)
    if (isEarlyLike && Number.isFinite(nextStartMs)) {
      const gapMin = Math.round((nextStartMs - previewEnd.getTime()) / 60_000)
      if (gapMin >= 0 && gapMin <= 18 * 60) {
        return { i18nKey: 'sleepLog.contextChip.beforeEarlyShift' }
      }
    }
    if (Number.isFinite(nextStartMs)) {
      const gapMin = Math.round((nextStartMs - previewEnd.getTime()) / 60_000)
      if (gapMin >= 0 && gapMin <= 8 * 60) {
        return { i18nKey: 'sleepLog.contextChip.betweenShifts' }
      }
    }
  }

  if (rotaSuggestion.reason === 'nap_length') {
    return { i18nKey: 'sleepLog.contextChip.shortWindow' }
  }

  return null
}
