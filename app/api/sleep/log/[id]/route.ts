import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiBadRequest, apiServerError } from '@/lib/api/response'
import {
  normalizeIanaTimeZone,
  normalizeSleepQuality,
  normalizeSleepType,
} from '@/lib/sleep/normalizeSleepLogPayload'

const SleepLogUpdateSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  quality: z.union([z.number(), z.string()]).nullable().optional(),
  naps: z.number().optional(),
  type: z
    .enum(['main_sleep', 'post_shift_sleep', 'recovery_sleep', 'nap', 'sleep', 'main', 'post_shift', 'recovery', 'pre_shift_nap'])
    .optional(),
  timezone: z.string().max(120).nullish(),
})

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  try {
    const parsed = await parseJsonBody(req, SleepLogUpdateSchema)
    if (!parsed.ok) return parsed.response
    const { startTime, endTime, quality, naps, type, timezone } = parsed.data

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return apiBadRequest('invalid_date_format', 'Invalid date format')
    }

    const durationMin = (endDate.getTime() - startDate.getTime()) / 60000
    const sleepHours = durationMin / 60

    if (durationMin < 0) {
      return apiBadRequest('invalid_date_range', 'endTime must be after startTime')
    }

    const date = startDate.toISOString().slice(0, 10)
    const qualityValue = normalizeSleepQuality(quality) ?? 3
    const napsValue = naps != null ? Math.max(0, Math.round(naps)) : 0
    const canonicalType = normalizeSleepType(type ?? (napsValue > 0 ? 'nap' : 'main_sleep'))
    if (!canonicalType) {
      return apiBadRequest('invalid_sleep_type', 'Invalid sleep type')
    }
    const clientTimeZone = normalizeIanaTimeZone(timezone ?? req.headers.get('x-time-zone'))
    if ((timezone ?? req.headers.get('x-time-zone')) && !clientTimeZone) {
      return apiBadRequest('invalid_timezone', 'timezone must be a valid IANA time zone')
    }

    const { id } = await context.params

    const updatePayload: Record<string, unknown> = {
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      type: canonicalType,
      quality: qualityValue,
      updated_at: new Date().toISOString(),
    }
    if (clientTimeZone) updatePayload.timezone = clientTimeZone

    const { data: updated, error } = await supabase
      .from('sleep_logs')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[/api/sleep/log/:id PUT] error:', error)
      return apiServerError('sleep_log_update_failed', error.message)
    }

    if (!updated) {
      return NextResponse.json({ ok: false, error: 'Log not found', code: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      sleep_log: {
        ...updated,
        date,
        start_ts: updated.start_at ?? startDate.toISOString(),
        end_ts: updated.end_at ?? endDate.toISOString(),
        sleep_hours: sleepHours,
        naps: canonicalType === 'nap' ? Math.max(1, napsValue) : 0,
      },
    })
  } catch (err: any) {
    console.error('[/api/sleep/log/:id PUT] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      { ok: false, error: err?.message || 'Internal server error', code: 'internal_error' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    // Always use service role client for deletes to bypass RLS
    // This ensures deletes work even if RLS policies are misconfigured
    const supabase = supabaseServer


    // Next 16: params is a Promise
    const { id } = await params

    if (!id) {
      console.error('[/api/sleep/log/:id DELETE] missing id param')
      return apiBadRequest('missing_id', 'Missing id')
    }

    // Basic UUID format guard to avoid 22P02
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      console.error('[/api/sleep/log/:id DELETE] invalid id format:', id)
      return apiBadRequest('invalid_id', 'Invalid id')
    }

    console.log('[/api/sleep/log/:id DELETE] Attempting to delete sleep log:', { id, userId })

    const { data, error } = await supabase
      .from('sleep_logs')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()

    if (error) {
      console.error('[/api/sleep/log/:id DELETE] delete error:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        id,
        userId,
      })
      return NextResponse.json(
        { ok: false, error: error.message || 'Failed to delete sleep log', code: 'sleep_log_delete_failed' },
        { status: 500 },
      )
    }

    console.log('[/api/sleep/log/:id DELETE] Successfully deleted:', { id, deletedRows: data?.length || 0 })

    return NextResponse.json({ success: true, deleted: data }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/sleep/log/:id DELETE] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      { ok: false, error: err?.message || 'Internal server error', code: 'internal_error' },
      { status: 500 },
    )
  }
}

