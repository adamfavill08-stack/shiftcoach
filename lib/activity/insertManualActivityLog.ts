import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import {
  stripActivityLogTimeKeys,
  withActivityLogSyncInstant,
  withBothActivityLogSyncInstants,
} from '@/lib/activity/activityLogSyncInstant'

export type ManualActivityReason = 'wearable_sync_missing' | 'forgot_watch' | 'other'

export type ManualActivityType = 'walk' | 'run' | 'workout' | 'shift' | 'custom'

export type InsertManualActivityLogInput = {
  userId: string
  activityDate: string
  steps: number
  activeMinutes?: number | null
  calories?: number | null
  distanceMeters?: number | null
  activityType: ManualActivityType
  reason: ManualActivityReason
  startTimeIso: string
  endTimeIso: string
  syncedAtIso: string
}

function registerPayload(attempts: Record<string, unknown>[], seen: Set<string>, payload: Record<string, unknown>) {
  const sig = JSON.stringify(payload, Object.keys(payload).sort())
  if (seen.has(sig)) return
  seen.add(sig)
  attempts.push(payload)
}

function registerTimeVariants(attempts: Record<string, unknown>[], seen: Set<string>, core: Record<string, unknown>, iso: string) {
  registerPayload(attempts, seen, withActivityLogSyncInstant(core, iso, 'ts'))
  registerPayload(attempts, seen, withActivityLogSyncInstant(core, iso, 'created_at'))
  registerPayload(attempts, seen, withBothActivityLogSyncInstants(core, iso))
}

function omitActivityDate(core: Record<string, unknown>): Record<string, unknown> {
  const o = { ...core }
  delete o.activity_date
  return o
}

export type ManualInsertPayloadPhases = {
  sessionAttempts: Record<string, unknown>[]
  minimalAttempts: Record<string, unknown>[]
  retry23505Session: Record<string, unknown>[]
  retry23505Minimal: Record<string, unknown>[]
}

/**
 * Builds ordered insert payloads: full session shapes first, minimal compatibility last.
 * Exported for regression tests (order and required session fields).
 */
export function buildManualInsertPayloadPhases(input: InsertManualActivityLogInput): ManualInsertPayloadPhases {
  const {
    userId,
    activityDate,
    steps,
    activeMinutes,
    calories,
    distanceMeters,
    activityType,
    reason,
    startTimeIso,
    endTimeIso,
    syncedAtIso,
  } = input

  const stepVal = Math.round(Math.max(0, steps))

  const metaBlock: Record<string, unknown> = {
    activity_type: activityType,
    start_time: startTimeIso,
    end_time: endTimeIso,
    reason,
    merge_status: 'active',
  }

  const rich: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    activity_date: activityDate,
    ...metaBlock,
  }

  if (activeMinutes != null && Number.isFinite(activeMinutes)) {
    rich.active_minutes = Math.round(Math.max(0, Math.min(24 * 60, activeMinutes)))
  }
  if (calories != null && Number.isFinite(calories)) {
    rich.calories = Math.round(Math.max(0, calories))
  }
  if (distanceMeters != null && Number.isFinite(distanceMeters)) {
    rich.distance_m = Math.round(Math.max(0, distanceMeters))
  }

  const withoutAm: Record<string, unknown> = { ...rich }
  delete withoutAm.active_minutes

  const withoutMetrics: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    activity_date: activityDate,
    ...metaBlock,
  }

  const bare: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    activity_date: activityDate,
  }

  /** Session row without optional metrics columns; always includes merge_status + window + type. */
  const bareNoMerge: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    activity_date: activityDate,
    activity_type: activityType,
    start_time: startTimeIso,
    end_time: endTimeIso,
    reason,
    merge_status: 'active',
  }

  /** Legacy DBs with no activity_date column */
  const legacyNoDate: Record<string, unknown> = {
    user_id: userId,
    source: 'manual',
    steps: stepVal,
    ...metaBlock,
  }

  const sessionAttempts: Record<string, unknown>[] = []
  const seenS = new Set<string>()
  // Never place `bare` before session shapes: it can succeed and skip merge_status / activity_type / times.
  for (const core of [rich, withoutAm, withoutMetrics, bareNoMerge]) {
    registerTimeVariants(sessionAttempts, seenS, core, syncedAtIso)
  }
  registerPayload(sessionAttempts, seenS, stripActivityLogTimeKeys(bareNoMerge))

  const minimalAttempts: Record<string, unknown>[] = []
  const seenM = new Set<string>()
  registerTimeVariants(minimalAttempts, seenM, bare, syncedAtIso)
  registerPayload(minimalAttempts, seenM, stripActivityLogTimeKeys(bare))
  registerTimeVariants(minimalAttempts, seenM, legacyNoDate, syncedAtIso)
  registerPayload(minimalAttempts, seenM, stripActivityLogTimeKeys(legacyNoDate))

  const retry23505Session: Record<string, unknown>[] = []
  const seenR = new Set<string>()
  for (const core of [rich, withoutAm, withoutMetrics, bareNoMerge].map(omitActivityDate)) {
    registerTimeVariants(retry23505Session, seenR, core, syncedAtIso)
    registerPayload(retry23505Session, seenR, stripActivityLogTimeKeys(core))
  }

  const retry23505Minimal: Record<string, unknown>[] = []
  const seenM2 = new Set<string>()
  for (const core of [bare, legacyNoDate].map(omitActivityDate)) {
    registerTimeVariants(retry23505Minimal, seenM2, core, syncedAtIso)
    registerPayload(retry23505Minimal, seenM2, stripActivityLogTimeKeys(core))
  }

  return { sessionAttempts, minimalAttempts, retry23505Session, retry23505Minimal }
}

/**
 * Inserts a dedicated manual session row (never upserts into wearable daily totals).
 * Tries full session payloads (merge_status, type, window, reason) before any minimal row.
 */
export async function insertManualActivityLog(
  supabase: SupabaseClient,
  input: InsertManualActivityLogInput,
): Promise<{ error: { message?: string; code?: string } | null }> {
  const { sessionAttempts, minimalAttempts, retry23505Session, retry23505Minimal } = buildManualInsertPayloadPhases(input)

  let lastErr: PostgrestError | null = null

  const runInserts = async (list: Record<string, unknown>[]): Promise<{ error: PostgrestError | null }> => {
    for (const payload of list) {
      const { error } = await supabase.from('activity_logs').insert(payload)
      if (!error) return { error: null }
      lastErr = error
    }
    return { error: lastErr }
  }

  const first = await runInserts(sessionAttempts)
  if (!first.error) return { error: null }

  console.warn(
    '[insertManualActivityLog] session-shaped inserts failed; trying minimal compatibility payloads',
    first.error?.code,
    first.error?.message,
  )

  const second = await runInserts(minimalAttempts)
  if (!second.error) {
    console.warn(
      '[insertManualActivityLog] minimal row inserted; DB may be missing session columns or rejected richer payloads',
    )
    return { error: null }
  }

  if (second.error?.code === '23505') {
    console.warn('[insertManualActivityLog] unique violation; retrying without activity_date', second.error.message)
    const third = await runInserts(retry23505Session)
    if (!third.error) return { error: null }
    const fourth = await runInserts(retry23505Minimal)
    if (!fourth.error) {
      console.warn('[insertManualActivityLog] minimal row inserted after 23505 retry')
      return { error: null }
    }
  }

  return { error: lastErr }
}
