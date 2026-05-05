import { addCalendarDaysToYmd, formatYmdInTimeZone, startOfLocalDayUtcMs } from '@/lib/sleep/utils'

/**
 * Raw roster rows from `/api/activity/history-30d` / Supabase.
 * Use rota timestamps only — `_ts` columns are canonical in DB; `_time` are accepted aliases matching rota naming.
 */
export type ActivityHistoryShiftRow = {
  date: string | null
  /** Roster classification for wording/thresholds only (e.g. NIGHT/DAY/LATE/CUSTOM); never used to infer clock windows. */
  label?: string | null
  shift_type?: string | null
  start_ts?: string | null
  end_ts?: string | null
  start_time?: string | null
  end_time?: string | null
}

export type ActivityHistoryStepSampleRow = {
  bucket_start_utc: string
  bucket_end_utc: string | null
  steps: number
}

export type ActivityHistorySegment = {
  label: string
  steps: number
}

export type ActivityHistoryDayType = 'night_shift' | 'day_shift' | 'evening_shift' | 'recovery' | 'day_off'

export type ActivityHistoryVerdict = 'Low' | 'Good' | 'High'

export type ActivityHistoryItem = {
  key: string
  dateLabel: string
  /** Roster-local time range only for shift rows, e.g. `17:30–02:30` (IANA tz from builder). */
  rosterTimeRange?: string
  type: ActivityHistoryDayType
  totalSteps: number
  duringShiftSteps: number | null
  verdict: ActivityHistoryVerdict
  insight: string
  segments: ActivityHistorySegment[]
  /** True when no wearable buckets overlapped this row’s counted windows (unknown vs intentional zero movement). */
  missingData?: boolean
}

export type ActivityHistorySummary = {
  shiftsTracked: number
  averageDuringShiftSteps: number
  lowMovementShifts: number
  bestShift: { label: string; steps: number } | null
}

export type ActivityHistory30DaysResult = {
  summary: ActivityHistorySummary
  items: ActivityHistoryItem[]
  hasAnyStepSamples: boolean
}

type ShiftWindow = {
  key: string
  label: string
  startMs: number
  endMs: number
  type: ActivityHistoryDayType
  rosterTimeRange: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = DAY_MS

function toFiniteMs(isoOrMs: string | number): number | null {
  if (typeof isoOrMs === 'number') {
    return Number.isFinite(isoOrMs) ? isoOrMs : null
  }
  const m = Date.parse(isoOrMs)
  return Number.isFinite(m) ? m : null
}

function resolveShiftEndpoints(row: ActivityHistoryShiftRow): { startMs: number; endMs: number } | null {
  const s = toFiniteMs(row.start_ts ?? row.start_time ?? '')
  const e = toFiniteMs(row.end_ts ?? row.end_time ?? '')
  if (s == null || e == null || e <= s) return null
  return { startMs: s, endMs: e }
}

/** Local civil YYYY-MM-DD for an instant in `timeZone` (canonical for bucketing across overnight shifts). */
function localYmd(instantMs: number, timeZone: string): string {
  return formatYmdInTimeZone(new Date(instantMs), timeZone)
}

/** True when roster end falls on a later local civil date than start (no fixed clock assumptions). */
function rosterCrossesLocalCivilEndDate(startMs: number, endMs: number, timeZone: string): boolean {
  return localYmd(startMs, timeZone) !== localYmd(endMs, timeZone)
}

/** Short weekday label in the user zone (consistent with roster cards). */
function formatWeekdayShort(instantMs: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone }).format(new Date(instantMs))
  } catch {
    return ''
  }
}

/** Display-only rota clock range in the user’s zone (24h). */
export function formatRosterTimeRange(startMs: number, endMs: number, timeZone: string): string {
  try {
    const opts: Intl.DateTimeFormatOptions = {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }
    const fmt = new Intl.DateTimeFormat('en-GB', opts)
    return `${fmt.format(new Date(startMs))}–${fmt.format(new Date(endMs))}`
  } catch {
    return ''
  }
}

function clampPositiveInt(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n)
}

function overlapMs(startA: number, endA: number, startB: number, endB: number): number {
  const start = Math.max(startA, startB)
  const end = Math.min(endA, endB)
  return Math.max(0, end - start)
}

function anyBucketOverlap(
  samples: ReadonlyArray<{ startMs: number; endMs: number }>,
  intervalStartMs: number,
  intervalEndMs: number,
): boolean {
  for (const s of samples) {
    if (overlapMs(intervalStartMs, intervalEndMs, s.startMs, s.endMs) > 0) return true
  }
  return false
}

function splitSampleAcrossSegments(
  sampleStartMs: number,
  sampleEndMs: number,
  steps: number,
  segments: Array<{ label: string; startMs: number; endMs: number }>,
): ActivityHistorySegment[] {
  if (sampleEndMs <= sampleStartMs || steps <= 0) {
    return segments.map((s) => ({ label: s.label, steps: 0 }))
  }

  const duration = sampleEndMs - sampleStartMs
  const raw = segments.map((segment) => {
    const ms = overlapMs(sampleStartMs, sampleEndMs, segment.startMs, segment.endMs)
    const proportional = ms > 0 ? (steps * ms) / duration : 0
    return { label: segment.label, rawSteps: proportional }
  })

  const rounded = raw.map((x) => ({ label: x.label, steps: Math.floor(x.rawSteps) }))
  let remainder = steps - rounded.reduce((sum, x) => sum + x.steps, 0)

  if (remainder > 0) {
    const byFraction = raw
      .map((x, i) => ({ i, fraction: x.rawSteps - Math.floor(x.rawSteps) }))
      .sort((a, b) => b.fraction - a.fraction)
    for (const slot of byFraction) {
      if (remainder <= 0) break
      rounded[slot.i].steps += 1
      remainder -= 1
    }
  }

  return rounded
}

/**
 * Verdict band / chip wording only — from explicit roster `label` or `shift_type`, never from clock inference.
 */
function shiftKindFromRota(row: ActivityHistoryShiftRow): ActivityHistoryDayType {
  const src = String(row.shift_type ?? row.label ?? '')
    .toUpperCase()
    .trim()
  if (!src) return 'day_shift'
  if (src === 'NIGHT' || src.includes('NIGHT')) return 'night_shift'
  if (src === 'LATE' || src.includes('LATE') || src.includes('EVENING') || src === 'AFTERNOON') return 'evening_shift'
  if (src === 'DAY' || src.includes('DAY')) return 'day_shift'
  if (src.includes('MORNING')) return 'day_shift'
  return 'day_shift'
}

function toShiftNavLabel(kind: ShiftWindow['type'], weekdayShort: string): string {
  if (kind === 'night_shift') return `${weekdayShort} Night Shift`
  if (kind === 'evening_shift') return `${weekdayShort} Evening Shift`
  return `${weekdayShort} Day Shift`
}

/** Merge overlapping / duplicate roster rows sharing the same local start day anchor. */
function mergeShiftsByAnchor(shiftRows: ActivityHistoryShiftRow[], timeZone: string): ShiftWindow[] {
  type Raw = {
    startMs: number
    endMs: number
    label: string | null
    kind: ActivityHistoryDayType
    range: string
  }

  const raws: Raw[] = []
  for (const row of shiftRows) {
    const se = resolveShiftEndpoints(row)
    if (!se) continue
    const kind = shiftKindFromRota(row)
    raws.push({
      startMs: se.startMs,
      endMs: se.endMs,
      label: row.label ?? null,
      kind,
      range: formatRosterTimeRange(se.startMs, se.endMs, timeZone),
    })
  }

  const byAnchor = new Map<string, Raw[]>()
  for (const r of raws) {
    const anchor = localYmd(r.startMs, timeZone)
    const list = byAnchor.get(anchor) ?? []
    list.push(r)
    byAnchor.set(anchor, list)
  }

  const out: ShiftWindow[] = []
  for (const [anchorYmd, list] of byAnchor) {
    list.sort((a, b) => a.startMs - b.startMs)
    const merged: Raw[] = []
    for (const cur of list) {
      const prev = merged[merged.length - 1]
      if (
        prev &&
        (cur.startMs === prev.startMs ||
          overlapMs(prev.startMs, prev.endMs, cur.startMs, cur.endMs) > 60_000 ||
          Math.abs(cur.startMs - prev.startMs) < 120_000)
      ) {
        prev.endMs = Math.max(prev.endMs, cur.endMs)
        prev.label = prev.label || cur.label || ''
        prev.kind = prev.kind // keep first row’s roster type for thresholds
        prev.range = formatRosterTimeRange(prev.startMs, prev.endMs, timeZone)
      } else {
        merged.push({ ...cur })
      }
    }
    for (const m of merged) {
      out.push({
        key: `${anchorYmd}:${m.startMs}|${m.endMs}`,
        label: m.label ?? '',
        startMs: m.startMs,
        endMs: m.endMs,
        type: m.kind,
        rosterTimeRange: m.range || formatRosterTimeRange(m.startMs, m.endMs, timeZone),
      })
    }
  }

  out.sort((a, b) => b.startMs - a.startMs)
  return out
}

function classifyVerdictForShift(kind: ActivityHistoryDayType, duringSteps: number): ActivityHistoryVerdict {
  if (kind === 'night_shift') {
    if (duringSteps < 1500) return 'Low'
    if (duringSteps <= 5500) return 'Good'
    return 'High'
  }
  // Day + evening shifts: same thresholds (slightly tougher than nights).
  if (duringSteps < 2500) return 'Low'
  if (duringSteps <= 7500) return 'Good'
  return 'High'
}

function classifyVerdictRecovery(totalSteps: number): ActivityHistoryVerdict {
  if (totalSteps < 1500) return 'Low'
  if (totalSteps <= 5000) return 'Good'
  return 'High'
}

function classifyVerdictDayOff(totalSteps: number): ActivityHistoryVerdict {
  if (totalSteps < 2000) return 'Low'
  if (totalSteps <= 8000) return 'Good'
  return 'High'
}

function buildInsight(type: ActivityHistoryDayType, verdict: ActivityHistoryVerdict, missingData: boolean): string {
  if (missingData) return 'No step data for this window yet.'

  if (type === 'recovery') {
    if (verdict === 'Low') return 'Gentle day—light movement is enough.'
    if (verdict === 'Good') return 'Recovery day looks balanced.'
    return 'High movement for a recovery day—rest if you can.'
  }
  if (type === 'day_off') {
    if (verdict === 'Low') return 'Quiet day off—easy walks still help.'
    if (verdict === 'Good') return 'Day off movement looks steady.'
    return 'Very active day off—nice work.'
  }
  if (type === 'night_shift') {
    if (verdict === 'Low') return 'Quiet night shift by steps.'
    if (verdict === 'Good') return 'Solid movement for a night shift.'
    return 'High movement on this night shift.'
  }
  if (verdict === 'Low') return 'Lower step count on this shift.'
  if (verdict === 'Good') return 'Healthy movement on this shift.'
  return 'High movement on this shift.'
}

function isLowMovementShiftForSummary(kind: ActivityHistoryDayType, duringSteps: number): boolean {
  if (kind === 'night_shift') return duringSteps < 1500
  return duringSteps < 2500
}

/**
 * Build 30 days of history ending at `now` in `timeZone`.
 * Overnight shifts anchor to the **local start date** only; spill onto the **next civil day** (same roster block) renders as Recovery — detected when roster end falls on a later local calendar date than start (not clock heuristics).
 */
export function buildActivityHistory30Days(params: {
  now?: Date
  timeZone: string
  shiftRows: ActivityHistoryShiftRow[]
  sampleRows: ActivityHistoryStepSampleRow[]
}): ActivityHistory30DaysResult {
  const now = params.now ?? new Date()
  const tz = params.timeZone?.trim() || 'UTC'

  const dayStartMemo = new Map<string, number>()
  const memoStartLocalDay = (ymd: string): number => {
    const k = `${tz}|${ymd}`
    const hit = dayStartMemo.get(k)
    if (hit != null) return hit
    const ms = startOfLocalDayUtcMs(ymd, tz)
    dayStartMemo.set(k, ms)
    return ms
  }

  const endYmd = formatYmdInTimeZone(now, tz)

  const shiftWindows = mergeShiftsByAnchor(params.shiftRows, tz)
  /** If multiple anchored windows share a civil day, keep the widest span for the roster card (most overlap). */
  const anchoredBestByLocalYmd = new Map<string, ShiftWindow>()
  for (const s of shiftWindows) {
    const anchor = localYmd(s.startMs, tz)
    const prev = anchoredBestByLocalYmd.get(anchor)
    if (!prev || s.endMs - s.startMs > prev.endMs - prev.startMs) anchoredBestByLocalYmd.set(anchor, s)
  }

  const parsedSamples = params.sampleRows
    .map((row) => {
      const sm = toFiniteMs(row.bucket_start_utc)
      if (sm == null) return null
      const fallbackEndMs = sm + 15 * 60 * 1000
      const em = row.bucket_end_utc != null ? toFiniteMs(row.bucket_end_utc) : fallbackEndMs
      if (em == null || em <= sm) return null
      return { startMs: sm, endMs: em, steps: clampPositiveInt(row.steps) }
    })
    .filter((x): x is { startMs: number; endMs: number; steps: number } => Boolean(x))

  const hasAnyStepSamples = parsedSamples.length > 0
  /** Buckets treated as wearable coverage (overlap checks). Zero-step buckets still count as “data present”. */
  const coverageBuckets = parsedSamples.filter((s) => s.steps >= 0)

  const items: ActivityHistoryItem[] = []
  const shiftStats: Array<{ label: string; steps: number; kind: ActivityHistoryDayType }> = []

  for (let i = 0; i < 30; i += 1) {
    const ymd = addCalendarDaysToYmd(endYmd, -i)
    const dayStartMs = memoStartLocalDay(ymd)
    const nextYmd = addCalendarDaysToYmd(ymd, 1)
    const dayEndMs = memoStartLocalDay(nextYmd)

    const anchored = anchoredBestByLocalYmd.get(ymd)

    const overnightSpill =
      !anchored &&
      shiftWindows.some((s) => {
        const anchor = localYmd(s.startMs, tz)
        if (anchor === ymd) return false
        const spansRosterAcrossCalendarDates = rosterCrossesLocalCivilEndDate(s.startMs, s.endMs, tz)
        return spansRosterAcrossCalendarDates && s.endMs > dayStartMs && s.startMs < dayEndMs
      })

    if (anchored) {
      const rosterEndDayYmd = localYmd(anchored.endMs, tz)
      const afterSegmentEndMs = memoStartLocalDay(addCalendarDaysToYmd(rosterEndDayYmd, 1))
      const beforeEndMs = Math.min(dayEndMs, Math.max(dayStartMs, anchored.startMs))
      const segmentSpec = [
        { label: 'Before', startMs: dayStartMs, endMs: beforeEndMs },
        { label: 'During', startMs: anchored.startMs, endMs: anchored.endMs },
        { label: 'After', startMs: anchored.endMs, endMs: afterSegmentEndMs },
      ]

      const segTotals = new Map<string, number>(segmentSpec.map((s) => [s.label, 0]))
      let duringSteps = 0

      for (const sample of parsedSamples) {
        if (sample.endMs <= segmentSpec[0].startMs || sample.startMs >= segmentSpec[2].endMs) continue
        const split = splitSampleAcrossSegments(sample.startMs, sample.endMs, sample.steps, segmentSpec)
        for (const part of split) {
          segTotals.set(part.label, (segTotals.get(part.label) ?? 0) + part.steps)
          if (part.label === 'During') duringSteps += part.steps
        }
      }

      const duringMissing = !anyBucketOverlap(coverageBuckets, anchored.startMs, anchored.endMs)
      const verdict = classifyVerdictForShift(anchored.type, duringSteps)
      const weekday = formatWeekdayShort(anchored.startMs, tz)
      const title = toShiftNavLabel(anchored.type, weekday)
      const range = anchored.rosterTimeRange || formatRosterTimeRange(anchored.startMs, anchored.endMs, tz)
      shiftStats.push({ label: `${title} · ${range}`, steps: duringSteps, kind: anchored.type })

      items.push({
        key: `shift:${anchored.key}`,
        dateLabel: title,
        rosterTimeRange: range,
        type: anchored.type,
        totalSteps: clampPositiveInt([...segTotals.values()].reduce((a, b) => a + b, 0)),
        duringShiftSteps: clampPositiveInt(duringSteps),
        verdict,
        insight: buildInsight(anchored.type, verdict, duringMissing),
        missingData: duringMissing,
        segments: segmentSpec.map((s) => ({
          label: s.label,
          steps: clampPositiveInt(segTotals.get(s.label) ?? 0),
        })),
      })
      continue
    }

    if (overnightSpill) {
      const middayMs = dayStartMs + 12 * 60 * 60 * 1000
      const eveningMs = dayStartMs + 18 * 60 * 60 * 1000
      const segmentSpec = [
        { label: 'Morning', startMs: dayStartMs, endMs: middayMs },
        { label: 'Midday', startMs: middayMs, endMs: eveningMs },
        { label: 'Evening', startMs: eveningMs, endMs: dayEndMs },
      ]
      const segTotals = new Map<string, number>(segmentSpec.map((s) => [s.label, 0]))
      for (const sample of parsedSamples) {
        if (sample.endMs <= dayStartMs || sample.startMs >= dayEndMs) continue
        const split = splitSampleAcrossSegments(sample.startMs, sample.endMs, sample.steps, segmentSpec)
        for (const part of split) {
          segTotals.set(part.label, (segTotals.get(part.label) ?? 0) + part.steps)
        }
      }
      const totalSteps = clampPositiveInt([...segTotals.values()].reduce((a, b) => a + b, 0))
      const dayMissing = !anyBucketOverlap(coverageBuckets, dayStartMs, dayEndMs)
      const verdict = classifyVerdictRecovery(totalSteps)
      const weekday = formatWeekdayShort(dayStartMs + 12 * 3600000, tz)
      items.push({
        key: `recovery-spill:${ymd}`,
        dateLabel: `${weekday} Recovery`,
        type: 'recovery',
        totalSteps,
        duringShiftSteps: null,
        verdict,
        insight: buildInsight('recovery', verdict, dayMissing),
        missingData: dayMissing,
        segments: segmentSpec.map((s) => ({
          label: s.label,
          steps: clampPositiveInt(segTotals.get(s.label) ?? 0),
        })),
      })
      continue
    }

    let lastEndedBeforeDay: ShiftWindow | null = null
    let bestEnd = -Infinity
    for (const s of shiftWindows) {
      if (s.endMs <= dayStartMs && s.endMs > bestEnd) {
        bestEnd = s.endMs
        lastEndedBeforeDay = s
      }
    }

    const isRecovery =
      Boolean(lastEndedBeforeDay) && dayStartMs - (lastEndedBeforeDay?.endMs ?? 0) <= TWENTY_FOUR_HOURS_MS
    const type: ActivityHistoryDayType = isRecovery ? 'recovery' : 'day_off'

    const middayMs = dayStartMs + 12 * 60 * 60 * 1000
    const eveningMs = dayStartMs + 18 * 60 * 60 * 1000
    const segmentSpec = [
      { label: 'Morning', startMs: dayStartMs, endMs: middayMs },
      { label: 'Midday', startMs: middayMs, endMs: eveningMs },
      { label: 'Evening', startMs: eveningMs, endMs: dayEndMs },
    ]

    const segTotals = new Map<string, number>(segmentSpec.map((s) => [s.label, 0]))
    for (const sample of parsedSamples) {
      if (sample.endMs <= dayStartMs || sample.startMs >= dayEndMs) continue
      const split = splitSampleAcrossSegments(sample.startMs, sample.endMs, sample.steps, segmentSpec)
      for (const part of split) {
        segTotals.set(part.label, (segTotals.get(part.label) ?? 0) + part.steps)
      }
    }

    const totalSteps = clampPositiveInt([...segTotals.values()].reduce((a, b) => a + b, 0))
    const dayMissing = !anyBucketOverlap(coverageBuckets, dayStartMs, dayEndMs)
    const verdict = type === 'recovery' ? classifyVerdictRecovery(totalSteps) : classifyVerdictDayOff(totalSteps)
    const weekday = formatWeekdayShort(dayStartMs + 12 * 3600000, tz)
    items.push({
      key: `day:${ymd}`,
      dateLabel: type === 'recovery' ? `${weekday} Recovery` : `${weekday} Day Off`,
      type,
      totalSteps,
      duringShiftSteps: null,
      verdict,
      insight: buildInsight(type, verdict, dayMissing),
      missingData: dayMissing,
      segments: segmentSpec.map((s) => ({
        label: s.label,
        steps: clampPositiveInt(segTotals.get(s.label) ?? 0),
      })),
    })
  }

  const shiftsTracked = shiftStats.length
  const averageDuringShiftSteps =
    shiftsTracked > 0
      ? Math.round(shiftStats.reduce((sum, row) => sum + row.steps, 0) / shiftsTracked)
      : 0
  const lowMovementShifts = shiftStats.filter((s) => isLowMovementShiftForSummary(s.kind, s.steps)).length
  const bestShift = shiftStats.length
    ? shiftStats.reduce((best, cur) => (cur.steps > best.steps ? cur : best))
    : null

  return {
    summary: {
      shiftsTracked,
      averageDuringShiftSteps,
      lowMovementShifts,
      bestShift: bestShift ? { label: bestShift.label, steps: bestShift.steps } : null,
    },
    items,
    hasAnyStepSamples,
  }
}
