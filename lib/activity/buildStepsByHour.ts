/**
 * Build 24 buckets for "steps by time of day".
 * With shift times: bucket i = steps during [shiftStart + i h, shiftStart + (i+1) h) (shift-worker day).
 * Without shift: bucket i = local civil hour i on the wall clock (legacy).
 */

export type BuildStepsByHourOptions = {
  shiftStart: Date | null
  /** Inclusive start; end of shift for weighting (falls back to `now` when null). */
  shiftEnd: Date | null
  now: Date
}

export function getLocalHourFromIso(iso: string, timeZone: string): number {
  const d = new Date(iso)
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  })
    .formatToParts(d)
    .find((p) => p.type === 'hour')?.value
  const h = hourPart != null ? parseInt(hourPart, 10) : 0
  return Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0
}

const HOUR_MS = 60 * 60 * 1000

function bucketIndexShiftAnchored(isoTime: string, shiftStart: Date): number | null {
  const t = new Date(isoTime).getTime()
  const s = shiftStart.getTime()
  if (t < s) return null
  const idx = Math.floor((t - s) / HOUR_MS)
  if (idx < 0 || idx > 23) return null
  return idx
}

/** Civil-day buckets (0–23 local hour) — daytime-shaped estimate when no shift anchor. */
function estimateStepsByHourCivil(totalSteps: number, timeZone: string, now: Date): number[] {
  if (totalSteps <= 0) return Array.from({ length: 24 }, () => 0)
  const currentHour = getLocalHourFromIso(now.toISOString(), timeZone)
  const weights = Array.from({ length: 24 }, (_, h) => {
    if (h > currentHour) return 0
    const w1 = Math.exp(-((h - 8) * (h - 8)) / 18)
    const w2 = Math.exp(-((h - 13) * (h - 13)) / 12)
    const w3 = Math.exp(-((h - 18) * (h - 18)) / 24)
    return 0.15 + w1 + w2 * 1.35 + w3
  })
  const sumW = weights.reduce((a, b) => a + b, 0) || 1
  const raw = weights.map((w) => (totalSteps * w) / sumW)
  const buckets = raw.map((x) => Math.floor(x))
  let rem = totalSteps - buckets.reduce((a, b) => a + b, 0)
  for (let h = currentHour; rem > 0 && h >= 0; h--) {
    buckets[h]++
    rem--
  }
  return buckets
}

/**
 * Buckets 0–23 = hours 0–23 after `shiftStart`. Weights follow the shift window; no fake steps in future slots.
 */
function estimateStepsByHourShiftAnchored(
  totalSteps: number,
  shiftStart: Date,
  shiftEnd: Date,
  now: Date,
): number[] {
  if (totalSteps <= 0) return Array.from({ length: 24 }, () => 0)

  const startMs = shiftStart.getTime()
  const endMs = Math.max(shiftEnd.getTime(), startMs)
  const nowMs = now.getTime()

  const shiftSpanH = Math.min(24, Math.max(1, Math.ceil((endMs - startMs) / HOUR_MS)))
  const midSlot = (shiftSpanH - 1) / 2

  const weights = Array.from({ length: 24 }, (_, i) => {
    const slotEnd = startMs + (i + 1) * HOUR_MS
    if (slotEnd > nowMs) return 0
    if (i >= shiftSpanH) return 0
    const dist = i - midSlot
    const bell = Math.exp(-(dist * dist) / (shiftSpanH * 0.55))
    return 0.12 + bell
  })

  const sumW = weights.reduce((a, b) => a + b, 0)
  if (sumW <= 0) {
    const out = Array.from({ length: 24 }, () => 0)
    if (totalSteps > 0) out[0] = totalSteps
    return out
  }
  const raw = weights.map((w) => (totalSteps * w) / sumW)
  const buckets = raw.map((x) => Math.floor(x))
  let rem = totalSteps - buckets.reduce((a, b) => a + b, 0)
  for (let i = 23; rem > 0 && i >= 0; i--) {
    if (weights[i] > 0) {
      buckets[i]++
      rem--
    }
  }
  if (rem > 0) {
    let mi = 0
    for (let i = 1; i < 24; i++) if (buckets[i] > buckets[mi]) mi = i
    buckets[mi] += rem
  }
  return buckets
}

export function stepsByHourFromCumulativeLogs(
  rows: { steps: number; ts?: string | null; created_at?: string | null }[],
  timeZone: string,
  dayTotalSteps: number,
  opts?: BuildStepsByHourOptions | null,
): number[] {
  const now = opts?.now ?? new Date()
  const shiftStart =
    opts?.shiftStart && !Number.isNaN(opts.shiftStart.getTime()) ? opts.shiftStart : null
  const useShiftAnchor = shiftStart != null
  let shiftEndResolved = now
  if (useShiftAnchor) {
    const se = opts?.shiftEnd
    if (se && !Number.isNaN(se.getTime()) && se.getTime() > shiftStart.getTime()) {
      shiftEndResolved = se
    }
  }

  const sorted = [...rows]
    .filter((r) => typeof r.steps === 'number' && r.steps >= 0)
    .map((r) => ({
      steps: r.steps,
      t: (r.ts || r.created_at) as string | null | undefined,
    }))
    .filter((r): r is { steps: number; t: string } => typeof r.t === 'string' && r.t.length > 0)
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())

  if (sorted.length === 0) {
    return useShiftAnchor
      ? estimateStepsByHourShiftAnchored(dayTotalSteps, shiftStart, shiftEndResolved, now)
      : estimateStepsByHourCivil(dayTotalSteps, timeZone, now)
  }

  const buckets = Array.from({ length: 24 }, () => 0)
  let prev = 0
  for (const row of sorted) {
    const delta = Math.max(0, row.steps - prev)
    if (delta > 0) {
      if (useShiftAnchor) {
        const idx = bucketIndexShiftAnchored(row.t, shiftStart!)
        if (idx != null) buckets[idx] += delta
      } else {
        const h = getLocalHourFromIso(row.t, timeZone)
        buckets[h] += delta
      }
    }
    prev = row.steps
  }

  const sumB = buckets.reduce((a, b) => a + b, 0)
  if (sumB === 0 && dayTotalSteps > 0) {
    return useShiftAnchor
      ? estimateStepsByHourShiftAnchored(dayTotalSteps, shiftStart!, shiftEndResolved, now)
      : estimateStepsByHourCivil(dayTotalSteps, timeZone, now)
  }
  if (sumB > 0 && dayTotalSteps > 0 && Math.abs(sumB - dayTotalSteps) / dayTotalSteps > 0.2) {
    const f = dayTotalSteps / sumB
    for (let i = 0; i < 24; i++) buckets[i] = Math.round(buckets[i] * f)
  }

  let s = buckets.reduce((a, b) => a + b, 0)
  const diff = dayTotalSteps - s
  if (diff !== 0 && dayTotalSteps >= 0) {
    let maxI = 0
    for (let i = 1; i < 24; i++) if (buckets[i] > buckets[maxI]) maxI = i
    buckets[maxI] = Math.max(0, buckets[maxI] + diff)
  }

  return buckets
}
