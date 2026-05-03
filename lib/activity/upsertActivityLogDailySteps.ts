import type { SupabaseClient } from '@supabase/supabase-js'
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
  if (
    r.error &&
    (r.error.code === '42703' ||
      String(r.error.message ?? '').includes('ts') ||
      String(r.error.message ?? '').includes('column'))
  ) {
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

async function upsertByActivityDate(
  supabase: SupabaseClient,
  userId: string,
  steps: number,
  syncedAt: string,
  source: string,
  activityDate: string,
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

  const payload = withOptionalActiveMinutes(
    { steps, source, ts: syncedAt, activity_date: activityDate },
    activeMinutes,
  )

  if (existing?.id) {
    let { error } = await supabase.from('activity_logs').update(payload).eq('id', existing.id)
    if (
      error &&
      activeMinutes != null &&
      (error.code === '42703' ||
        String(error.message ?? '').toLowerCase().includes('active_minutes'))
    ) {
      ;({ error } = await supabase
        .from('activity_logs')
        .update({ steps, source, ts: syncedAt, activity_date: activityDate })
        .eq('id', existing.id))
    }
    return { error: error ?? null }
  }

  const { error: insErr } = await supabase
    .from('activity_logs')
    .insert({ user_id: userId, ...payload })

  if (insErr?.code === '23505') {
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
      let { error } = await supabase.from('activity_logs').update(payload).eq('id', again.id)
      if (
        error &&
        activeMinutes != null &&
        (error.code === '42703' ||
          String(error.message ?? '').toLowerCase().includes('active_minutes'))
      ) {
        ;({ error } = await supabase
          .from('activity_logs')
          .update({ steps, source, ts: syncedAt, activity_date: activityDate })
          .eq('id', again.id))
      }
      const err = error ?? null
      await maybeSupersedeManualsAfterWearableWrite(supabase, userId, activityDate, source, steps, !err)
      return { error: err }
    }
  }

  if (
    insErr &&
    (insErr.code === '42703' || String(insErr.message ?? '').toLowerCase().includes('active_minutes'))
  ) {
    const payloadNoAm = { steps, source, ts: syncedAt, activity_date: activityDate }
    const { error: ins2 } = await supabase.from('activity_logs').insert({ user_id: userId, ...payloadNoAm })
    const err = ins2 ?? null
    await maybeSupersedeManualsAfterWearableWrite(supabase, userId, activityDate, source, steps, !err)
    return { error: err }
  }

  const finalErr = insErr ?? null
  await maybeSupersedeManualsAfterWearableWrite(supabase, userId, activityDate, source, steps, !finalErr)
  return { error: finalErr }
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
  },
): Promise<{ error: { message?: string; code?: string } | null }> {
  const { steps, syncedAt, source, activeMinutes } = options
  const raw = typeof options.activityDate === 'string' ? options.activityDate.trim() : ''
  const activityDate = YMD.test(raw) ? raw : null

  if (activityDate) {
    return upsertByActivityDate(supabase, userId, steps, syncedAt, source, activityDate, activeMinutes)
  }

  return upsertByUtcTsWindow(supabase, userId, steps, syncedAt, source, activeMinutes)
}
