import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'
import { addCalendarDaysToYmd, formatYmdInTimeZone, startOfLocalDayUtcMs } from '@/lib/sleep/utils'
import {
  insertManualActivityLog,
  type ManualActivityReason,
  type ManualActivityType,
} from '@/lib/activity/insertManualActivityLog'
import type { ManualHistoryEntry } from '@/lib/activity/manualHistoryApi'
import { isPostgrestSchemaColumnError } from '@/lib/activity/isPostgrestSchemaColumnError'

export const dynamic = 'force-dynamic'

const ManualBodySchema = z.object({
  steps: z.coerce.number().int().min(0).max(120_000),
  activeMinutes: z.number().int().min(0).max(24 * 60).optional().nullable(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeZone: z.string().max(120).optional(),
  activityType: z.enum(['walk', 'run', 'workout', 'shift', 'custom']).optional().default('walk'),
  reason: z.enum(['wearable_sync_missing', 'forgot_watch', 'other']).optional().default('wearable_sync_missing'),
  /** When start/end omitted, window length defaults to this many minutes (min 1). */
  durationMinutes: z.number().int().min(0).max(24 * 60).optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  calories: z.number().int().min(0).optional().nullable(),
  distanceMeters: z.number().int().min(0).optional().nullable(),
})

function resolveTimeZone(req: NextRequest, bodyTz?: string): string {
  const q = req.nextUrl.searchParams.get('tz')?.trim()
  const b = typeof bodyTz === 'string' ? bodyTz.trim() : ''
  const candidate = q || b || ''
  if (candidate) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: candidate })
      return candidate.slice(0, 120)
    } catch {
      // fall through
    }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function parseIsoOrNull(s: string | null | undefined): Date | null {
  if (typeof s !== 'string' || !s.trim()) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const MANUAL_HISTORY_SELECT_FULL_TS =
  'id, activity_type, steps, active_minutes, calories, distance_m, start_time, end_time, reason, merge_status, superseded_by_source, superseded_at, ts'

const MANUAL_HISTORY_SELECT_FULL_CA =
  'id, activity_type, steps, active_minutes, calories, distance_m, start_time, end_time, reason, merge_status, superseded_by_source, superseded_at, created_at'

const MANUAL_HISTORY_SELECT_MINIMAL_TS = 'id, steps, ts, activity_date, source'

const MANUAL_HISTORY_SELECT_MINIMAL_CA = 'id, steps, created_at, activity_date, source'

function dedupeManualRowsById(rows: readonly Record<string, unknown>[]): Record<string, unknown>[] {
  const m = new Map<string, Record<string, unknown>>()
  for (const r of rows) {
    const id = r.id
    if (id == null) continue
    m.set(String(id), r)
  }
  return [...m.values()]
}

function mapActivityLogRowToManualHistory(row: Record<string, unknown>): ManualHistoryEntry {
  const stepsRaw = row.steps
  const steps =
    typeof stepsRaw === 'number' && Number.isFinite(stepsRaw) ? Math.max(0, Math.round(stepsRaw)) : 0
  const am = row.active_minutes
  const cal = row.calories
  const dm = row.distance_m
  return {
    id: String(row.id ?? ''),
    activity_type: typeof row.activity_type === 'string' ? row.activity_type : null,
    steps,
    active_minutes:
      typeof am === 'number' && Number.isFinite(am) ? Math.round(Math.max(0, am)) : null,
    calories: typeof cal === 'number' && Number.isFinite(cal) ? Math.round(Math.max(0, cal)) : null,
    distance_m: typeof dm === 'number' && Number.isFinite(dm) ? Math.round(Math.max(0, dm)) : null,
    start_time: typeof row.start_time === 'string' ? row.start_time : null,
    end_time: typeof row.end_time === 'string' ? row.end_time : null,
    reason: typeof row.reason === 'string' ? row.reason : null,
    merge_status: typeof row.merge_status === 'string' ? row.merge_status : null,
    superseded_by_source: typeof row.superseded_by_source === 'string' ? row.superseded_by_source : null,
    superseded_at: typeof row.superseded_at === 'string' ? row.superseded_at : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()
    if (!supabase) {
      return apiServerError('no_db', 'Database connection unavailable')
    }

    const tz = resolveTimeZone(req)
    const dateParam = req.nextUrl.searchParams.get('date')?.trim()
    const activityDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : formatYmdInTimeZone(new Date(), tz)

    const manualSources = ['manual', 'Manual entry'] as const

    const runSelect = async (cols: string, orderCol: 'ts' | 'created_at') => {
      return supabase
        .from('activity_logs')
        .select(cols)
        .eq('user_id', userId)
        .in('source', [...manualSources])
        .eq('activity_date', activityDate)
        .order(orderCol, { ascending: false })
    }

    const strategies: Array<{ cols: string; order: 'ts' | 'created_at' }> = [
      { cols: MANUAL_HISTORY_SELECT_FULL_TS, order: 'ts' },
      { cols: MANUAL_HISTORY_SELECT_FULL_CA, order: 'created_at' },
      { cols: MANUAL_HISTORY_SELECT_MINIMAL_TS, order: 'ts' },
      { cols: MANUAL_HISTORY_SELECT_MINIMAL_CA, order: 'created_at' },
    ]

    let rows: unknown[] | null = null
    let error: { message?: string; code?: string } | null = null
    let winning: { cols: string; order: 'ts' | 'created_at' } | null = null

    for (const s of strategies) {
      const r = await runSelect(s.cols, s.order)
      rows = r.data as unknown[] | null
      error = r.error
      if (!error) {
        winning = s
        break
      }
      if (!isPostgrestSchemaColumnError(error)) break
    }

    if (error) {
      console.error('[/api/activity/manual] GET history failed', error)
      return apiServerError('query_failed', error.message ?? 'Could not load manual activity')
    }

    let list = (rows ?? []) as unknown as Record<string, unknown>[]

    const dayStartMs = startOfLocalDayUtcMs(activityDate, tz)
    const dayEndMs = startOfLocalDayUtcMs(addCalendarDaysToYmd(activityDate, 1), tz)
    if (winning && Number.isFinite(dayStartMs) && Number.isFinite(dayEndMs)) {
      const isoFrom = new Date(dayStartMs).toISOString()
      const isoTo = new Date(dayEndMs).toISOString()
      const extra: Record<string, unknown>[] = []
      const colHay = ` ${winning.cols} `
      const colsHasTs = /\bts\b/.test(colHay)
      const colsHasCreatedAt = /\bcreated_at\b/.test(colHay)

      if (colsHasTs) {
        const r = await supabase
          .from('activity_logs')
          .select(winning.cols)
          .eq('user_id', userId)
          .in('source', [...manualSources])
          .is('activity_date', null)
          .gte('ts', isoFrom)
          .lt('ts', isoTo)
          .order('ts', { ascending: false })
        if (!r.error && Array.isArray(r.data)) extra.push(...(r.data as unknown as Record<string, unknown>[]))
      }

      if (colsHasCreatedAt) {
        const r = await supabase
          .from('activity_logs')
          .select(winning.cols)
          .eq('user_id', userId)
          .in('source', [...manualSources])
          .is('activity_date', null)
          .gte('created_at', isoFrom)
          .lt('created_at', isoTo)
          .order('created_at', { ascending: false })
        if (!r.error && Array.isArray(r.data)) extra.push(...(r.data as unknown as Record<string, unknown>[]))
      }

      const civilOk = (row: Record<string, unknown>) => {
        const t = row.ts ?? row.created_at
        if (typeof t !== 'string' || !t.trim()) return false
        const d = new Date(t)
        if (Number.isNaN(d.getTime())) return false
        return formatYmdInTimeZone(d, tz) === activityDate
      }

      list = dedupeManualRowsById([...list, ...extra.filter(civilOk)])
      list.sort((a, b) => {
        const ta = new Date(String(a.ts ?? a.created_at ?? 0)).getTime()
        const tb = new Date(String(b.ts ?? b.created_at ?? 0)).getTime()
        return tb - ta
      })
    }

    const entries: ManualHistoryEntry[] = list.map(mapActivityLogRowToManualHistory).filter((e) => e.id)

    return NextResponse.json(
      { date: activityDate, entries },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/activity/manual] GET', err)
    return apiServerError('unexpected', message)
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Deletes one manual session row owned by the user (wearable rows are never deleted here).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()
    if (!supabase) {
      return apiServerError('no_db', 'Database connection unavailable')
    }

    const id = req.nextUrl.searchParams.get('id')?.trim() ?? ''
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('source', 'manual')
      .select('id')

    if (error) {
      console.error('[/api/activity/manual] DELETE failed', error)
      return apiServerError('delete_failed', error.message ?? 'Could not delete entry')
    }
    if (!data?.length) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/activity/manual] DELETE', err)
    return apiServerError('unexpected', message)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()
    if (!supabase) {
      return apiServerError('no_db', 'Database connection unavailable')
    }

    const parsed = await parseJsonBody(req, ManualBodySchema)
    if (!parsed.ok) return parsed.response

    const body = parsed.data
    const tz = resolveTimeZone(req, body.timeZone ?? undefined)
    const activityDate = body.activityDate ?? formatYmdInTimeZone(new Date(), tz)
    const syncedAtIso = new Date().toISOString()

    const end = parseIsoOrNull(body.endTime) ?? new Date()
    const duration =
      typeof body.durationMinutes === 'number' && body.durationMinutes > 0
        ? body.durationMinutes
        : 60
    const start = parseIsoOrNull(body.startTime) ?? new Date(end.getTime() - Math.max(1, duration) * 60_000)

    const result = await insertManualActivityLog(supabase, {
      userId,
      activityDate,
      steps: body.steps,
      activeMinutes: body.activeMinutes ?? undefined,
      calories: body.calories ?? undefined,
      distanceMeters: body.distanceMeters ?? undefined,
      activityType: body.activityType as ManualActivityType,
      reason: body.reason as ManualActivityReason,
      startTimeIso: start.toISOString(),
      endTimeIso: end.toISOString(),
      syncedAtIso,
    })

    if (result.error) {
      console.error('[/api/activity/manual] insert failed', result.error)
      return apiServerError('insert_failed', result.error.message ?? 'Could not save manual activity')
    }

    return NextResponse.json(
      {
        success: true,
        steps: body.steps,
        activityDate,
        source: 'manual',
      },
      { status: 200 },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/activity/manual]', err)
    return apiServerError('unexpected', message)
  }
}
