/**
 * Build `shifts` rows from a repeating slot pattern (same semantics as /api/rota/apply).
 */
import { getPatternSlots } from '@/lib/rota/patternSlots'

const slotToType: Record<string, string> = {
  M: 'morning',
  A: 'afternoon',
  D: 'day',
  N: 'night',
  O: 'off',
}

const slotToLabel: Record<string, string> = {
  M: 'MORNING',
  A: 'AFTERNOON',
  D: 'DAY',
  N: 'NIGHT',
  O: 'OFF',
}

export type ConcreteShiftRow = {
  user_id: string
  date: string
  label: string
  status: string
  start_ts: string | null
  end_ts: string | null
  notes: string | null
}

/** Local calendar YYYY-MM-DD (matches shift `date` column semantics used across rota). */
export function shiftDateKeyLocal(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Inclusive count of calendar days from `rangeStart`'s date through `throughDate`'s calendar date. */
export function countInclusiveCalendarDays(rangeStart: Date, throughDate: Date): number {
  const dayMs = 86400000
  const a = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate())
  const b = new Date(throughDate.getFullYear(), throughDate.getMonth(), throughDate.getDate())
  const diff = (b.getTime() - a.getTime()) / dayMs
  return diff >= 0 ? Math.floor(diff) + 1 : 0
}

export type BuildConcreteShiftsRowsArgs = {
  userId: string
  patternId: string
  /** Anchor date for the pattern cycle (local midnight). */
  patternStart: Date
  startCycleIndex: number
  /** First calendar day to emit (local midnight). */
  rangeStart: Date
  /** Number of consecutive calendar days (1 = single day). */
  dayCount: number
  shiftTimes?: Record<string, { start?: string; end?: string }>
  commute?: unknown
}

/**
 * Emits one row per calendar day in [rangeStart, rangeStart + dayCount), deduped by date (last wins).
 */
export function buildConcreteShiftsRows({
  userId,
  patternId,
  patternStart,
  startCycleIndex,
  rangeStart,
  dayCount,
  shiftTimes,
  commute,
}: BuildConcreteShiftsRowsArgs): ConcreteShiftRow[] {
  const patternSlots = getPatternSlots(patternId)
  if (!patternSlots.length || dayCount <= 0) {
    return []
  }

  const L = patternSlots.length
  const dayMs = 86400000
  const base = new Date(rangeStart)
  base.setHours(0, 0, 0, 0)
  const anchor = new Date(patternStart)
  anchor.setHours(0, 0, 0, 0)

  const daysFromPatternStart = Math.floor((base.getTime() - anchor.getTime()) / dayMs)

  const rows: ConcreteShiftRow[] = []
  const notesJson = commute ? JSON.stringify(commute) : null

  for (let i = 0; i < dayCount; i += 1) {
    const currentDate = new Date(base.getTime() + i * dayMs)
    const slotIndex = (((startCycleIndex + daysFromPatternStart + i) % L) + L) % L
    const slot = patternSlots[slotIndex]
    const shiftType = slotToType[slot] || 'off'
    const label = slotToLabel[slot] || 'OFF'
    const dateStr = shiftDateKeyLocal(currentDate)

    if (shiftType === 'off') {
      rows.push({
        user_id: userId,
        date: dateStr,
        label: 'OFF',
        status: 'PLANNED',
        start_ts: null,
        end_ts: null,
        notes: null,
      })
    } else {
      const times = shiftTimes?.[shiftType]
      let start_ts: string | null = null
      let end_ts: string | null = null

      if (times?.start && times?.end) {
        const [startHour, startMin] = times.start.split(':').map(Number)
        const [endHour, endMin] = times.end.split(':').map(Number)

        const startDateTime = new Date(currentDate)
        startDateTime.setHours(startHour, startMin, 0, 0)

        const endDateTime = new Date(currentDate)
        endDateTime.setHours(endHour, endMin, 0, 0)

        if (endHour < startHour || (endHour === startHour && endMin < startMin)) {
          endDateTime.setDate(endDateTime.getDate() + 1)
        }

        start_ts = startDateTime.toISOString()
        end_ts = endDateTime.toISOString()
      }

      rows.push({
        user_id: userId,
        date: dateStr,
        label,
        status: 'PLANNED',
        start_ts,
        end_ts,
        notes: notesJson,
      })
    }
  }

  const byDate = new Map<string, ConcreteShiftRow>()
  for (const row of rows) {
    byDate.set(row.date, row)
  }
  return Array.from(byDate.values())
}
