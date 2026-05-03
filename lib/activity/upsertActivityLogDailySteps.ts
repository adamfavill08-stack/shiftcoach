import type { SupabaseClient } from '@supabase/supabase-js'
import { isPostgrestSchemaColumnError } from '@/lib/activity/isPostgrestSchemaColumnError'
import { markAllManualSessionsSupersededForWearableDay } from '@/lib/activity/manualWearableSupersede'

const YMD = /^\d{4}-\d{2}-\d{2}$/

function withOptionalActiveMinutes(
  base: Record<string, unknown>,
  activeMinutes: number | null | undefined,
): Record<string, unknown> {
  if (activeMinutes == null || !Number.isFinite(activeMinutes)) return base
  return { ...base, active_minutes: Math.round(Math.max(0, Math.min(24 * 60, activeMinutes))) }
}

async function upsertByUtcTsWindow(
  supabase: SupabaseClient,
  userId: string,
  steps: number,
  syncedAt: string,
  source: string,
  activeMinutes?: number | null,
): Promise<{ error: { message?: string; code?: string } | null }> {
  const today = new Date().toISOString().slice(0, 10)
  const startIso = new Date(today + 'T00:00:00Z').toISOString()
  const endIso = new Date(today + 'T23:59:59Z').toISOString()

  const attempt = async (timeCol: 'ts' | 'created_at') => {
    const { data: existing, error: selErr } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', userId)
      .gte(timeCol, startIso)
      .lt(timeCol, endIso)
      .order(timeCol, { ascending: false })
      .limit(1)
      .maybeSingle()
    if (selErr) return { error: selErr }
    const updatePayload = withOptionalActiveMinutes(
      timeCol === 'ts' ? { steps, source, ts: syncedAt } : { steps, source },
      activeMinutes,
    )
    const insertPayload = withOptionalActiveMinutes(
      timeCol === 'ts' ? { user_id: userId, steps, source, ts: syncedAt } : { user_id: userId, steps, source },
      activeMinutes,
    )
    if (existing?.id) {
      const { error } = await supabase.from('activity_logs').update(updatePayload).eq('id', existing.id)
      return { error: error ?? null }
    }
    const { error } = await supabase.from('activity_logs').insert(insertPayload)
    return { error: error ?? null }
  }

  let r = await attempt('ts')
  if (r.error && isPostgrestSchemaColumnError(r.error)) {
    r = await attempt('created_at')
  }
  return r
}

async function maybeSupersedeManualsAfterWearableWrite(
  supabase: SupabaseClient,
  userId: string,
  activityDate: string,
  source: string,
  steps: number,
  writeOk: boolean,
): Promise<void> {
  if (!writeOk || steps <= 0) return
  try {
    await markAllManualSessionsSupersededForWearableDay(supabase, userId, activityDate, source)
  } catch (e) {
    console.warn('[upsertActivityLogDailySteps] supersede manuals failed', e)
  }
}

/**
 * Writes (steps, source, activity_date, timestamps) trying column combinations so missing `ts`
 * or `logged_at` on older DBs does not fail the whole upsert.
 */
async function writeWearableDailyByActivityDate(
  supabase: SupabaseClient,
  userId: string,
  existingId: string | null,
  steps: number,
  source: string,
  activityDate: string,
  syncedAt: string,
  loggedAtIso: string,
  activeMinutes?: number | null,
): Promise<{ error: { message?: string; code?: string } | null }> {
  const baseVariants: Record<string, unknown>[] = [
    { steps, source, activity_date: activityDate, ts: syncedAt, logged_at: loggedAtIso },
    { steps, source, activity_date: activityDate, logged_at: loggedAtIso },
    { steps, source, activity_date: activityDate, ts: syncedAt },
    { steps, source, activity_date: activityDate },
  ]

  let lastErr: { message?: string; code?: string } | null = null

  for (const base of baseVariants) {
    const payload = withOptionalActiveMinutes(base, activeMinutes)
    const payloadNoAm = base

    if (existingId) {
      let { error } = await supabase.from('activity_logs').update(payload).eq('id', existingId)
      if (
        error &&
        activeMinutes != null &&
        isPostgrestSchemaColumnError(error) &&
        String(error.message ?? '').toLowerCase().includes('active_minutes')
      ) {
        ;({ error } = await supabase.from('activity_logs').update(payloadNoAm).eq('id', existingId))
      }
      if (!error) return { error: null }
      if (!isPostgrestSchemaColumnError(error)) return { error }
      lastErr = error
      continue
    }

    let { error: insErr } = await supabase.from('activity_logs').insert({ user_id: userId, ...payload })
    if (
      insErr &&
      activeMinutes != null &&
      isPostgrestSchemaColumnError(insErr) &&
      String(insErr.message ?? '').toLowerCase().includes('active_minutes')
    ) {
      ;({ error: insErr } = await supabase.from('activity_logs').insert({ user_id: userId, ...payloadNoAm }))
    }

    if (!insErr) return { error: null }

    if (insErr.code === '23505') {
      const { data: again } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('activity_date', activityDate)
        .or('source.neq.manual,source.is.null')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (again?.id) {
        return writeWearableDailyByActivityDate(
          supabase,
          userId,
          String(again.id),
          steps,
          source,
          activityDate,
          syncedAt,
          loggedAtIso,
          activeMinutes,
        )
      }
    }

    if (!isPostgrestSchemaColumnError(insErr)) return { error: insErr }
    lastErr = insErr
  }

  return { error: lastErr }
}

async function upsertByActivityDate(
  supabase: SupabaseClient,
  userId: string,
  steps: number,
  syncedAt: string,
  source: string,
  activityDate: string,
  loggedAtIso: string,
  activeMinutes?: number | null,
): Promise<{ error: { message?: string; code?: string } | null }> {
  const { data: existing, error: selErr } = await supabase
    .from('activity_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('activity_date', activityDate)
    .or('source.neq.manual,source.is.null')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selErr) {
    if (selErr.code === '42703' || String(selErr.message ?? '').includes('activity_date')) {
      return upsertByUtcTsWindow(supabase, userId, steps, syncedAt, source, activeMinutes)
    }
    return { error: selErr }
  }

  const existingId = existing?.id != null ? String(existing.id) : null
  const r = await writeWearableDailyByActivityDate(
    supabase,
    userId,
    existingId,
    steps,
    source,
    activityDate,
    syncedAt,
    loggedAtIso,
    activeMinutes,
  )

  await maybeSupersedeManualsAfterWearableWrite(supabase, userId, activityDate, source, steps, !r.error)
  return r
}

/**
 * Upsert daily steps: prefer (user_id, activity_date) when activityDate is set (Health local day).
 * Falls back to legacy UTC-midnight ts window when activityDate is omitted or activity_date unsupported.
 */
export async function upsertActivityLogDailySteps(
  supabase: SupabaseClient,
  userId: string,
  options: {
    steps: number
    syncedAt: string
    source: string
    activityDate?: string | null
    /** When supported by DB, stored on the same daily row as steps. */
    activeMinutes?: number | null
    /**
     * Health Connect / device anchor for civil day (latest sample end or sync time).
     * Defaults to `syncedAt`.
     */
    loggedAt?: string | null
  },
): Promise<{ error: { message?: string; code?: string } | null }> {
  const { steps, syncedAt, source, activeMinutes } = options
  const raw = typeof options.activityDate === 'string' ? options.activityDate.trim() : ''
  const activityDate = YMD.test(raw) ? raw : null
  const loggedAtIso =
    typeof options.loggedAt === 'string' && options.loggedAt.trim()
      ? options.loggedAt.trim()
      : syncedAt

  if (activityDate) {
    return upsertByActivityDate(
      supabase,
      userId,
      steps,
      syncedAt,
      source,
      activityDate,
      loggedAtIso,
      activeMinutes,
    )
  }

  return upsertByUtcTsWindow(supabase, userId, steps, syncedAt, source, activeMinutes)
}
