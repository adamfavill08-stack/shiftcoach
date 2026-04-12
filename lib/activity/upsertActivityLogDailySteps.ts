import type { SupabaseClient } from '@supabase/supabase-js'

const YMD = /^\d{4}-\d{2}-\d{2}$/

async function upsertByUtcTsWindow(
  supabase: SupabaseClient,
  userId: string,
  steps: number,
  syncedAt: string,
  source: string,
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
    const updatePayload =
      timeCol === 'ts'
        ? { steps, source, ts: syncedAt }
        : { steps, source }
    const insertPayload =
      timeCol === 'ts'
        ? { user_id: userId, steps, source, ts: syncedAt }
        : { user_id: userId, steps, source }
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

async function upsertByActivityDate(
  supabase: SupabaseClient,
  userId: string,
  steps: number,
  syncedAt: string,
  source: string,
  activityDate: string,
): Promise<{ error: { message?: string; code?: string } | null }> {
  const { data: existing, error: selErr } = await supabase
    .from('activity_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('activity_date', activityDate)
    .maybeSingle()

  if (selErr) {
    if (selErr.code === '42703' || String(selErr.message ?? '').includes('activity_date')) {
      return upsertByUtcTsWindow(supabase, userId, steps, syncedAt, source)
    }
    return { error: selErr }
  }

  const payload = { steps, source, ts: syncedAt, activity_date: activityDate }

  if (existing?.id) {
    const { error } = await supabase.from('activity_logs').update(payload).eq('id', existing.id)
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
      .maybeSingle()
    if (again?.id) {
      const { error } = await supabase.from('activity_logs').update(payload).eq('id', again.id)
      return { error: error ?? null }
    }
  }

  return { error: insErr ?? null }
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
  },
): Promise<{ error: { message?: string; code?: string } | null }> {
  const { steps, syncedAt, source } = options
  const raw = typeof options.activityDate === 'string' ? options.activityDate.trim() : ''
  const activityDate = YMD.test(raw) ? raw : null

  if (activityDate) {
    return upsertByActivityDate(supabase, userId, steps, syncedAt, source, activityDate)
  }

  return upsertByUtcTsWindow(supabase, userId, steps, syncedAt, source)
}
