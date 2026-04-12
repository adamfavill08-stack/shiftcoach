/**
 * Shift background agent — fetches roster + wake, runs computeUserShiftState, logs.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalyserShiftInput } from '@/lib/shift-pattern-analyser/types'
import { isoLocalDate } from '@/lib/shifts'
import { filterShiftsIn72hWindow, computeUserShiftState } from '@/lib/shift-agent/computeUserShiftState'
import type { ShiftAgentLogPayload, UserShiftState } from '@/lib/shift-agent/types'
import {
  applyHolidayAsOffToShiftRows,
  fetchHolidayLocalDatesSet,
} from '@/lib/rota/holidayRotaPriority'

const LOG_PREFIX = '[shiftAgent]'
const PATTERN_BACK_DAYS = 28

function logPayload(payload: ShiftAgentLogPayload) {
  const serializable = {
    reason: payload.reason,
    analysisNotes: payload.analysisNotes,
    state: {
      ...payload.state,
      lastCalculated: payload.state.lastCalculated.toISOString(),
      activeTransition: payload.state.activeTransition
        ? {
            ...payload.state.activeTransition,
            nextShiftStart: payload.state.activeTransition.nextShiftStart.toISOString(),
            transitionStarted: payload.state.activeTransition.transitionStarted.toISOString(),
          }
        : null,
      mealWindows: {
        meal1: payload.state.mealWindows.meal1.toISOString(),
        meal2: payload.state.mealWindows.meal2.toISOString(),
        anchorMeal: payload.state.mealWindows.anchorMeal.toISOString(),
        shiftSnack1: payload.state.mealWindows.shiftSnack1.toISOString(),
        shiftSnack2: payload.state.mealWindows.shiftSnack2?.toISOString() ?? null,
      },
      sleepWindows: {
        primarySleep: {
          start: payload.state.sleepWindows.primarySleep.start.toISOString(),
          end: payload.state.sleepWindows.primarySleep.end.toISOString(),
        },
        napWindow: payload.state.sleepWindows.napWindow
          ? {
              start: payload.state.sleepWindows.napWindow.start.toISOString(),
              end: payload.state.sleepWindows.napWindow.end.toISOString(),
            }
          : null,
      },
    },
  }
  console.info(LOG_PREFIX, serializable)
}

async function fetchLatestWakeEnd(supabase: SupabaseClient, userId: string, now: Date): Promise<Date> {
  let row: { end_at?: string; end_ts?: string } | null = null
  const r1 = await supabase
    .from('sleep_logs')
    .select('end_at')
    .eq('user_id', userId)
    .not('end_at', 'is', null)
    .order('end_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!r1.error && r1.data?.end_at) {
    row = r1.data as { end_at?: string }
  } else {
    const r2 = await supabase
      .from('sleep_logs')
      .select('end_ts')
      .eq('user_id', userId)
      .not('end_ts', 'is', null)
      .order('end_ts', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!r2.error && r2.data?.end_ts) row = r2.data as { end_ts?: string }
  }

  const raw = row?.end_at ?? row?.end_ts
  if (raw) {
    const d = new Date(raw as string)
    if (Number.isFinite(d.getTime())) return d
  }

  const fallback = new Date(now)
  fallback.setHours(7, 0, 0, 0)
  return fallback
}

async function fetchShiftsForUser(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
): Promise<AnalyserShiftInput[]> {
  const from = new Date(now)
  from.setDate(from.getDate() - PATTERN_BACK_DAYS)
  const to = new Date(now)
  to.setDate(to.getDate() + 14)
  const fromY = isoLocalDate(from)
  const toY = isoLocalDate(to)

  const { data, error } = await supabase
    .from('shifts')
    .select('date,label,start_ts,end_ts')
    .eq('user_id', userId)
    .gte('date', fromY)
    .lte('date', toY)
    .order('date', { ascending: true })

  if (error) {
    console.warn(LOG_PREFIX, 'fetch shifts error', error.message)
    return []
  }

  const rows = (data ?? []) as AnalyserShiftInput[]
  const holidayDates = await fetchHolidayLocalDatesSet(supabase, userId, fromY, toY)
  return applyHolidayAsOffToShiftRows(rows, holidayDates)
}

export type RunShiftAgentOptions = {
  supabase: SupabaseClient
  userId: string
  /** Override clock (tests). */
  now?: Date
  /** Override wake anchor. */
  wakeTime?: Date
  reason: string
}

/**
 * Entry point: load data, compute UserShiftState, log structured payload.
 */
export async function runShiftAgent(opts: RunShiftAgentOptions): Promise<UserShiftState> {
  const now = opts.now ?? new Date()
  const shifts = await fetchShiftsForUser(opts.supabase, opts.userId, now)
  const wakeTime = opts.wakeTime ?? (await fetchLatestWakeEnd(opts.supabase, opts.userId, now))
  const shifts72h = filterShiftsIn72hWindow(shifts, now)

  const { state, notes } = computeUserShiftState({
    now,
    wakeTime,
    shiftsForPattern: shifts,
    shifts72h,
  })

  logPayload({ reason: opts.reason, state, analysisNotes: notes })
  return state
}

/** DOM event name other code can fire after rota writes (see shift-state-provider). */
export const ROTA_UPDATED_EVENT = 'shiftcoach:rota-updated'

export function notifyRotaUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ROTA_UPDATED_EVENT))
}
