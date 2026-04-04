/**
 * Calendar all-day / holiday events use midnight as start_at, but shift workers
 * are still on shift until end_ts. Countdowns should use shift end when the
 * nominal start falls inside the current shift window.
 */

export type RotaEventLike = {
  all_day?: boolean | null
  type?: string | null
}

export type ShiftInterval = { start: Date; end: Date }

const DEFAULT_BUFFER_MS = 60 * 60 * 1000

export function isWholeDayRotaEvent(event: RotaEventLike): boolean {
  if (event.all_day === true) return true
  const t = String(event.type || '').toLowerCase()
  return t === 'holiday'
}

/**
 * Shift currently overlapping `now`, using the same travel-buffer idea as
 * activity/shift windows: include shifts that start soon or ended recently.
 */
export function findShiftWindowOverlappingNow(
  days: Array<{ start_ts?: string | null; end_ts?: string | null }>,
  now: Date,
  bufferMs: number = DEFAULT_BUFFER_MS
): ShiftInterval | null {
  const nowT = now.getTime()
  for (const d of days) {
    if (!d.start_ts || !d.end_ts) continue
    const s = new Date(d.start_ts).getTime()
    const e = new Date(d.end_ts).getTime()
    if (Number.isNaN(s) || Number.isNaN(e)) continue
    if (s <= nowT + bufferMs && e > nowT - bufferMs) {
      return { start: new Date(d.start_ts), end: new Date(d.end_ts) }
    }
  }
  return null
}

/**
 * @param eventStart - rota_events.start_at (instant)
 * @param shift - active shift window from findShiftWindowOverlappingNow, or null
 */
export function effectiveEventNotificationStart(
  eventStart: Date,
  now: Date,
  event: RotaEventLike,
  shift: ShiftInterval | null
): Date {
  if (!shift || !isWholeDayRotaEvent(event)) return eventStart

  const N = eventStart.getTime()
  const S = shift.start.getTime()
  const E = shift.end.getTime()
  const nowT = now.getTime()

  if (N >= S && N < E && nowT < E) {
    return shift.end
  }
  return eventStart
}
