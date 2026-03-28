/**
 * Build a local wake timestamp on today's calendar for spacing Breakfast / Lunch / …
 *
 * Raw sleep `end_ts` is often a nap, a timezone quirk, or "woke at 8pm" — using it
 * verbatim makes labels like "Breakfast" show at 20:20. For production we only trust
 * sleep end when it falls in a plausible morning window; otherwise default 07:00 local.
 */
export function resolveDiurnalWakeAnchor(rawWakeEnd: Date | null, now: Date): Date {
  const out = new Date(now)
  let hour: number
  let minute: number

  if (!rawWakeEnd || Number.isNaN(rawWakeEnd.getTime())) {
    out.setHours(7, 0, 0, 0)
    return out
  }

  const rw = new Date(rawWakeEnd)
  hour = rw.getHours()
  minute = rw.getMinutes()
  const minutesFromMidnight = hour * 60 + minute

  // ~04:00–10:30 local: treat as real main wake for a breakfast-first day plan
  const morningStart = 4 * 60
  const morningEnd = 10 * 60 + 30

  if (minutesFromMidnight >= morningStart && minutesFromMidnight <= morningEnd) {
    out.setHours(hour, minute, 0, 0)
    return out
  }

  // Midday / evening / night sleep end → do not label-spoof "breakfast" at 20:20
  out.setHours(7, 0, 0, 0)
  return out
}

/**
 * When we have no logged sleep but model a post–night-shift day, use a typical late-morning anchor.
 */
export function resolveDefaultWakeNoSleep(now: Date, shiftType: 'day' | 'night' | 'late' | 'off'): Date {
  const out = new Date(now)
  if (shiftType === 'night') {
    out.setHours(8, 30, 0, 0)
  } else {
    out.setHours(7, 0, 0, 0)
  }
  return out
}
