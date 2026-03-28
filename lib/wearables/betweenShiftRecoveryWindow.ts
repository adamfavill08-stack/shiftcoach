export type ShiftRow = {
  label: string | null
  start_ts: string | null
  end_ts: string | null
  date?: string | null
}

function parseMs(s: string | null): number | null {
  if (!s) return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}

export type BetweenShiftWindow = {
  start: Date
  end: Date
  sourceWindowLabel: string
}

/**
 * HR “recovery” window: time between end of a work shift and the next shift start (or now),
 * or the gap between the previous shift and the current shift when the user is on shift now.
 */
export function computeBetweenShiftRecoveryWindow(
  shifts: ShiftRow[],
  nowMs: number
): BetweenShiftWindow | null {
  const work = shifts
    .filter((s) => s.label && String(s.label).trim() !== '' && String(s.label).toUpperCase() !== 'OFF')
    .map((s) => ({
      start: parseMs(s.start_ts),
      end: parseMs(s.end_ts),
    }))
    .filter((s): s is { start: number; end: number } => s.start != null && s.end != null && s.end > s.start)
    .sort((a, b) => a.start - b.start)

  if (work.length === 0) return null

  const now = nowMs

  let onShiftIdx = -1
  for (let i = 0; i < work.length; i++) {
    if (now >= work[i].start && now < work[i].end) {
      onShiftIdx = i
      break
    }
  }

  if (onShiftIdx > 0) {
    const prev = work[onShiftIdx - 1]
    const cur = work[onShiftIdx]
    if (prev.end <= cur.start && cur.start - prev.end >= 60 * 1000) {
      return {
        start: new Date(prev.end),
        end: new Date(cur.start),
        sourceWindowLabel: 'Between your previous shift and this one',
      }
    }
  }

  if (onShiftIdx === -1) {
    let lastEnded: (typeof work)[0] | null = null
    for (let i = work.length - 1; i >= 0; i--) {
      if (work[i].end <= now) {
        lastEnded = work[i]
        break
      }
    }
    if (!lastEnded) return null

    const nextAfter = work.find((s) => s.start > lastEnded!.end)
    const endMs = nextAfter ? Math.min(nextAfter.start, now) : now
    if (endMs <= lastEnded.end) return null
    const gapMs = endMs - lastEnded.end
    if (gapMs < 60 * 1000) return null

    return {
      start: new Date(lastEnded.end),
      end: new Date(endMs),
      sourceWindowLabel: 'Since your last shift',
    }
  }

  return null
}
