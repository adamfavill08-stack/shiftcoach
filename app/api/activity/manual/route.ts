import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'
import { formatYmdInTimeZone } from '@/lib/sleep/utils'
import {
  insertManualActivityLog,
  type ManualActivityReason,
  type ManualActivityType,
} from '@/lib/activity/insertManualActivityLog'
import type { ManualHistoryEntry } from '@/lib/activity/manualHistoryApi'

export const dynamic = 'force-dynamic'

const ManualBodySchema = z.object({
  steps: z.number().int().min(0).max(120_000),
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

const MANUAL_HISTORY_SELECT_FULL =
  'id, activity_type, steps, active_minutes, calories, distance_m, start_time, end_time, reason, merge_status, superseded_by_source, superseded_at, ts'

const MANUAL_HISTORY_SELECT_MINIMAL = 'id, steps, ts, activity_date, source'

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

    const runSelect = async (cols: string) => {
      return supabase
        .from('activity_logs')
        .select(cols)
        .eq('user_id', userId)
        .eq('source', 'manual')
        .eq('activity_date', activityDate)
        .order('ts', { ascending: false })
    }

    let { data: rows, error } = await runSelect(MANUAL_HISTORY_SELECT_FULL)

    if (error?.code === '42703') {
      const second = await runSelect(MANUAL_HISTORY_SELECT_MINIMAL)
      rows = second.data
      error = second.error
    }

    if (error) {
      console.error('[/api/activity/manual] GET history failed', error)
      return apiServerError('query_failed', error.message ?? 'Could not load manual activity')
    }

    const list = (rows ?? []) as unknown as Record<string, unknown>[]
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
