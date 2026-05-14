import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiBadRequest, apiServerError } from '@/lib/api/response'
import type { SleepType } from '@/lib/sleep/types'
import { minutesBetween } from '@/lib/sleep/utils'
import { normalizeIanaTimeZone } from '@/lib/sleep/normalizeSleepLogPayload'

export const dynamic = 'force-dynamic'

const SleepSessionPatchSchema = z.object({
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  type: z.enum(['main_sleep', 'post_shift_sleep', 'recovery_sleep', 'nap']).optional(),
  quality: z.number().int().min(1).max(5).nullable().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  session_type: z.enum(['sleep', 'main', 'nap']).optional(),
  source: z
    .enum(['manual', 'apple_health', 'health_connect', 'fitbit', 'oura', 'garmin'])
    .optional(),
  timezone: z.string().max(120).nullish(),
})

/**
 * PATCH /api/sleep/sessions/[id]
 * Update an existing sleep session
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const { id } = await context.params
    const parsed = await parseJsonBody(req, SleepSessionPatchSchema)
    if (!parsed.ok) return parsed.response
    const input = parsed.data
    const startAt = input.startAt ?? input.start_time
    const endAt = input.endAt ?? input.end_time

    console.log('[api/sleep/sessions/:id PATCH] Received update request:', {
      id,
      startAt,
      endAt,
      type: input.type,
      session_type: input.session_type,
      quality: input.quality,
      source: input.source,
    })

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: 'startAt and endAt are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(startAt)
    const endDate = new Date(endAt)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return apiBadRequest('invalid_date_format', 'Invalid date format')
    }

    if (endDate.getTime() <= startDate.getTime()) {
      return apiBadRequest('invalid_time_range', 'endAt must be after startAt')
    }

    const durationMinutes = minutesBetween(startDate, endDate)
    if (durationMinutes < 10) {
      return apiBadRequest('invalid_duration', 'Sleep session must be at least 10 minutes')
    }
    if (durationMinutes > 24 * 60) {
      return apiBadRequest('invalid_duration', 'Sleep session cannot be longer than 24 hours')
    }

    const mappedLegacyType: SleepType =
      input.session_type === 'nap' ? 'nap' : 'main_sleep'
    const canonicalType: SleepType = input.type ?? mappedLegacyType
    const clientTimeZoneRaw = input.timezone ?? req.headers.get('x-time-zone')
    const clientTimeZone = normalizeIanaTimeZone(clientTimeZoneRaw)
    if (clientTimeZoneRaw && !clientTimeZone) {
      return apiBadRequest('invalid_timezone', 'timezone must be a valid IANA time zone')
    }

    const updatePayload: Record<string, unknown> = {
      type: canonicalType,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      quality: input.quality ?? null,
      updated_at: new Date().toISOString(),
    }
    if (input.source) updatePayload.source = input.source
    if (clientTimeZone) updatePayload.timezone = clientTimeZone

    const updateResult = await supabase
      .from('sleep_logs')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()
      .maybeSingle()

    if (updateResult.error) {
      console.error('[api/sleep/sessions/:id PATCH] error:', updateResult.error)
      return apiServerError('sleep_session_update_failed', updateResult.error.message)
    }

    if (!updateResult.data) {
      return NextResponse.json({ error: 'Sleep session not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, session: updateResult.data }, { status: 200 })
  } catch (err: any) {
    console.error('[api/sleep/sessions/:id PATCH] FATAL ERROR:', err)
    return apiServerError('unexpected_error', err?.message || 'Internal server error')
  }
}

/**
 * DELETE /api/sleep/sessions/[id]
 * Delete a sleep session
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const { id } = await context.params

    if (!id) {
      console.log('[api/sleep/session] DELETE missing id')
      return apiBadRequest('missing_id', 'Missing id')
    }

    console.log('[api/sleep/session] DELETE id=', id, 'userId=', userId)

    // Soft-delete session from sleep_logs
    const { data: deletedData, error } = await supabase
      .from('sleep_logs')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()

    if (error) {
      console.error('[api/sleep/session] DELETE error:', error)
      return apiServerError('sleep_session_delete_failed', error.message)
    }

    // Check if any row was actually deleted
    if (!deletedData || deletedData.length === 0) {
      console.log('[api/sleep/session] DELETE no rows deleted - session not found or not owned by user')
      return NextResponse.json(
        { error: 'Sleep session not found' },
        { status: 404 }
      )
    }

    console.log('[api/sleep/session] DELETE successful, deleted:', deletedData.length, 'row(s)')
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error('[api/sleep/session] DELETE FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    return apiServerError('unexpected_error', err?.message || 'Internal server error')
  }
}
