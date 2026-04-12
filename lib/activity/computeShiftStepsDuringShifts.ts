/**
 * Attribute step deltas from cumulative sync logs to rota shift time windows (last 7 civil days).
 * Falls back to the day’s total steps when only a single aggregate exists for a work shift day.
 */

import type { ShiftType } from '@/lib/activity/calculateIntensityBreakdown'

export type ShiftStepsDuringShiftDay = {
  date: string
  dayLabel: string
  steps: number
  hasData: boolean
  /** False for off days or days with no scheduled shift times */
  hasWorkShift: boolean
  shiftType: ShiftType | null
}

export type RotaShiftRow = {
  date: string
  label: string | null
  start_ts: string | null
  end_ts: string | null
}

const BUFFER_MS = 60 * 60 * 1000

function dayLetter(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return labels[d.getDay()] ?? '?'
}

function shiftWindowForDay(
  row: RotaShiftRow | undefined,
  shiftType: ShiftType,
  nowMs: number,
): { start: number; end: number } | null {
  if (!row?.start_ts || shiftType === 'off') return null
  const start = new Date(row.start_ts).getTime() - BUFFER_MS
  const endTs = row.end_ts ? new Date(row.end_ts).getTime() : nowMs
  const end = Math.min(endTs + BUFFER_MS, nowMs)
  if (!(end > start)) return null
  return { start, end }
}

export function computeShiftStepsDuringShiftsLast7Days(
  sevenDayYmdsOldestFirst: string[],
  shiftsByDate: Map<string, RotaShiftRow>,
  shiftTypeByDate: Map<string, ShiftType>,
  activityByDate: Map<string, { steps: number }>,
  logs: Array<{ steps: number; ts?: string | null; created_at?: string | null }>,
  now: Date,
): ShiftStepsDuringShiftDay[] {
  const nowMs = now.getTime()

  const sortedLogs = [...logs]
    .filter((r) => (r.ts || r.created_at) && typeof r.steps === 'number')
    .map((r) => ({ steps: r.steps, t: (r.ts || r.created_at) as string }))
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())

  const windows = new Map<string, { start: number; end: number }>()
  for (const d of sevenDayYmdsOldestFirst) {
    const st = shiftTypeByDate.get(d) ?? 'other'
    const row = shiftsByDate.get(d)
    const w = shiftWindowForDay(row, st, nowMs)
    if (w) windows.set(d, w)
  }

  const tally = new Map<string, number>()
  for (const d of sevenDayYmdsOldestFirst) tally.set(d, 0)

  let prevSteps = 0
  for (const row of sortedLogs) {
    const tMs = new Date(row.t).getTime()
    const delta = Math.max(0, row.steps - prevSteps)
    prevSteps = row.steps
    if (delta <= 0) continue

    for (const d of sevenDayYmdsOldestFirst) {
      const w = windows.get(d)
      if (!w) continue
      if (tMs >= w.start && tMs <= w.end) {
        tally.set(d, (tally.get(d) ?? 0) + delta)
        break
      }
    }
  }

  return sevenDayYmdsOldestFirst.map((date) => {
    const st = shiftTypeByDate.get(date) ?? 'other'
    const row = shiftsByDate.get(date)
    const hasWorkShift = st !== 'off' && !!row?.start_ts
    let steps = tally.get(date) ?? 0
    const dayTotal = activityByDate.get(date)?.steps ?? 0

    if (hasWorkShift && steps === 0 && dayTotal > 0) {
      steps = dayTotal
    }

    return {
      date,
      dayLabel: dayLetter(date),
      steps,
      hasData: steps > 0,
      hasWorkShift,
      shiftType: st,
    }
  })
}

/** Empty series for API fallbacks (7 days ending at `todayYmd`). */
export function stubShiftStepsLast7Days(todayYmd: string): ShiftStepsDuringShiftDay[] {
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const out: ShiftStepsDuringShiftDay[] = []
  for (let i = 6; i >= 0; i--) {
    const base = new Date(todayYmd + 'T12:00:00')
    base.setDate(base.getDate() - i)
    const ymd = base.toISOString().slice(0, 10)
    out.push({
      date: ymd,
      dayLabel: labels[base.getDay()] ?? '?',
      steps: 0,
      hasData: false,
      hasWorkShift: false,
      shiftType: null,
    })
  }
  return out
}
