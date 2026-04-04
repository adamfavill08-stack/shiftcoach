/**
 * Circadian background agent — loads sleep + profile, runs calculateCircadianScore, logs.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserShiftState } from '@/lib/shift-agent/types'
import {
  calculateCircadianScore,
  type CircadianState,
  type CircadianUserProfile,
  type SleepIntervalForGap,
  type SleepLog,
} from '@/lib/circadian/calculateCircadianScore'

const LOG_PREFIX = '[circadianAgent]'

/** Client: dispatch after any successful sleep_logs create/update/delete so circadian can refresh. */
export const SLEEP_LOGS_UPDATED_EVENT = 'shiftcoach:sleep-logs-updated'

/**
 * Fired from ShiftStateProvider after runShiftAgent finishes for a rota update.
 * Circadian listens with the fresh UserShiftState (avoids racing the shift context).
 */
export const CIRCADIAN_AFTER_ROTA_SHIFT_STATE_EVENT = 'shiftcoach:circadian-after-rota-shift-state'

export type CircadianAfterRotaDetail = {
  reason: string
  userShiftState: UserShiftState
}

export function notifySleepLogsUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SLEEP_LOGS_UPDATED_EVENT))
}

/** Ms until next occurrence of hour:minute in `timeZone` (20s resolution, max ~26h search). */
export function getMsUntilNextLocalClockTime(
  from: Date,
  timeZone: string,
  hour: number,
  minute: number,
): number {
  const stepMs = 20_000
  let t = from.getTime()
  const limit = t + 26 * 3600 * 1000
  while (t < limit) {
    const d = new Date(t)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d)
    const h = Number(parts.find((p) => p.type === 'hour')?.value)
    const m = Number(parts.find((p) => p.type === 'minute')?.value)
    if (h === hour && m === minute) {
      return Math.max(t - from.getTime(), 60_000)
    }
    t += stepMs
  }
  return 24 * 3600 * 1000
}

function isMainSleepRow(row: Record<string, unknown>): boolean {
  const t = row.type
  if (t === 'nap' || t === 'pre_shift_nap') return false
  const naps = row.naps
  if (typeof naps === 'number' && naps > 0) return false
  return true
}

function rowToSleepLog(row: Record<string, unknown>): SleepLog | null {
  const start = (row.start_at ?? row.start_ts) as string | undefined
  const end = (row.end_at ?? row.end_ts) as string | undefined
  if (!start || !end) return null
  return { sleep_start: start, sleep_end: end }
}

export function normalizeSleepRowsToSleepLogs(rows: unknown[]): SleepLog[] {
  const out: SleepLog[] = []
  for (const r of rows) {
    const row = r as Record<string, unknown>
    if (row.deleted_at) continue
    if (!isMainSleepRow(row)) continue
    const log = rowToSleepLog(row)
    if (log) out.push(log)
  }
  return out
}

/** All sleep rows (main + nap) for inter-sleep gap scoring; includes main rows filtered out of `normalizeSleepRowsToSleepLogs` when `naps > 0`. */
export function normalizeSleepRowsToGapIntervals(rows: unknown[]): SleepIntervalForGap[] {
  const out: SleepIntervalForGap[] = []
  for (const r of rows) {
    const row = r as Record<string, unknown>
    if (row.deleted_at) continue
    const log = rowToSleepLog(row)
    if (!log) continue
    const t = row.type
    const kind: SleepIntervalForGap['kind'] =
      t === 'nap' || t === 'pre_shift_nap' ? 'nap' : 'main'
    out.push({ ...log, kind })
  }
  return out
}

const LOOKBACK_DAYS = 14

export type CircadianSleepFetch = { sleepLogs: SleepLog[]; gapIntervals: SleepIntervalForGap[] }

export async function fetchSleepDataForCircadianAgent(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
): Promise<CircadianSleepFetch> {
  const empty: CircadianSleepFetch = { sleepLogs: [], gapIntervals: [] }
  const from = new Date(now.getTime() - (LOOKBACK_DAYS - 1) * 24 * 60 * 60 * 1000)
  const iso = from.toISOString()

  const q1 = await supabase
    .from('sleep_logs')
    .select('type, start_at, end_at, naps, deleted_at')
    .eq('user_id', userId)
    .gte('start_at', iso)
    .order('start_at', { ascending: false })
    .limit(100)

  if (!q1.error && q1.data && q1.data.length > 0) {
    const data = q1.data as unknown[]
    const sleepLogs = normalizeSleepRowsToSleepLogs(data)
    const gapIntervals = normalizeSleepRowsToGapIntervals(data)
    if (sleepLogs.length > 0) return { sleepLogs, gapIntervals }
  }

  const q2 = await supabase
    .from('sleep_logs')
    .select('type, start_ts, end_ts, naps, deleted_at')
    .eq('user_id', userId)
    .gte('start_ts', iso)
    .order('start_ts', { ascending: false })
    .limit(100)

  if (q2.error) {
    console.warn(LOG_PREFIX, 'fetch sleep_logs error', q2.error.message)
    return empty
  }

  const data = (q2.data ?? []) as unknown[]
  return {
    sleepLogs: normalizeSleepRowsToSleepLogs(data),
    gapIntervals: normalizeSleepRowsToGapIntervals(data),
  }
}

/** @deprecated Prefer fetchSleepDataForCircadianAgent for nap-aware gap scoring. */
export async function fetchSleepLogsForCircadianAgent(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
): Promise<SleepLog[]> {
  const { sleepLogs } = await fetchSleepDataForCircadianAgent(supabase, userId, now)
  return sleepLogs
}

export async function fetchCircadianUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<CircadianUserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('sleep_goal_h, tz')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn(LOG_PREFIX, 'fetch profile error', error.message)
  }

  const row = data as { sleep_goal_h?: number | null; tz?: string | null } | null
  const sleepGoal = row?.sleep_goal_h
  return {
    sleep_goal_h: typeof sleepGoal === 'number' && Number.isFinite(sleepGoal) ? sleepGoal : 7.5,
    timezone: row?.tz?.trim() || 'UTC',
  }
}

export type CircadianAgentLogPayload = {
  reason: string
  notes: string[]
  state: CircadianState
}

function logCircadianPayload(payload: CircadianAgentLogPayload) {
  const s = payload.state
  const serializable = {
    reason: payload.reason,
    notes: payload.notes,
    state: {
      ...s,
      lastCalculated: s.lastCalculated.toISOString(),
    },
  }
  console.info(LOG_PREFIX, serializable)
}

export type RunCircadianAgentOptions = {
  supabase: SupabaseClient
  userId: string
  userShiftState: UserShiftState | null
  reason: string
  now?: Date
}

/**
 * Entry point: load last-14d main sleep logs + profile, compute circadian state, log.
 */
export async function runCircadianAgent(opts: RunCircadianAgentOptions): Promise<CircadianState> {
  const now = opts.now ?? new Date()
  const [{ sleepLogs, gapIntervals }, profile] = await Promise.all([
    fetchSleepDataForCircadianAgent(opts.supabase, opts.userId, now),
    fetchCircadianUserProfile(opts.supabase, opts.userId),
  ])

  const state = calculateCircadianScore(sleepLogs, opts.userShiftState, profile, {
    now,
    allSleepIntervalsForGap: gapIntervals,
  })

  const notes = [
    `inputs: sleepLogs=${sleepLogs.length} main, gapIntervals=${gapIntervals.length} (main+nap, 14d) tz=${profile.timezone} sleep_goal_h=${profile.sleep_goal_h}`,
    `primary sleepMidpointOffset_h=${state.sleepMidpointOffset} score=${state.score} status=${state.status}`,
    `dataQuality=${state.dataQuality} adaptedPattern=${state.adaptedPattern} trend=${state.trend} (${state.trendDays}d)`,
    `timing: peakAlertness=${state.peakAlertnessTime} lowEnergy=${state.lowEnergyTime}`,
    `shiftContext: userShiftState=${opts.userShiftState ? opts.userShiftState.currentMode : 'null'}`,
  ]

  logCircadianPayload({ reason: opts.reason, notes, state })
  return state
}
