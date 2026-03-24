import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiBadRequest, apiServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

const SleepSessionPatchSchema = z.object({
  start_time: z.string(),
  end_time: z.string(),
  session_type: z.enum(['sleep', 'nap']).optional(),
  quality: z.union([z.string(), z.number()]).nullable().optional(),
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
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    // Always use service role client to bypass RLS (consistent with other sleep routes)
    const supabase = supabaseServer


    const { id } = await context.params
    const parsed = await parseJsonBody(req, SleepSessionPatchSchema)
    if (!parsed.ok) return parsed.response
    const { start_time, end_time, session_type, quality } = parsed.data

    console.log('[api/sleep/sessions/:id PATCH] Received update request:', {
      id,
      start_time,
      end_time,
      session_type,
      quality,
    })

    if (!start_time || !end_time) {
      return NextResponse.json(
        { error: 'start_time and end_time are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(start_time)
    const endDate = new Date(end_time)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return apiBadRequest('invalid_date_format', 'Invalid date format')
    }

    if (endDate.getTime() <= startDate.getTime()) {
      return apiBadRequest('invalid_time_range', 'end_time must be after start_time')
    }

    // Map session_type to type field
    const type = session_type === 'nap' ? 'nap' : 'sleep'

    // Convert quality text to int for old schema compatibility (if needed)
    const qualityMap: Record<string, number> = {
      'Excellent': 5,
      'Good': 4,
      'Fair': 3,
      'Poor': 1,
    }
    const qualityInt = quality && typeof quality === 'string' ? (qualityMap[quality] || null) : (typeof quality === 'number' ? quality : null)
    const qualityText = quality && typeof quality === 'string' ? quality : null

    console.log('[api/sleep/sessions/:id PATCH] Quality conversion:', {
      original: quality,
      text: qualityText,
      int: qualityInt,
    })

    // Try new schema first
    let updateResult = await supabase
      .from('sleep_logs')
      .update({
        type,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        quality: qualityText || qualityInt || null,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle()

    if (updateResult.error) {
      console.log('[api/sleep/sessions/:id PATCH] New schema failed, trying old schema:', updateResult.error.message)
      // Try old schema
      updateResult = await supabase
        .from('sleep_logs')
        .update({
          start_ts: startDate.toISOString(),
          end_ts: endDate.toISOString(),
          naps: session_type === 'nap' ? 1 : 0,
          quality: qualityInt || null,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle()
    }

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
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    // Always use service role client to bypass RLS (consistent with other sleep routes)
    const supabase = supabaseServer


    const { id } = await context.params

    if (!id) {
      console.log('[api/sleep/session] DELETE missing id')
      return apiBadRequest('missing_id', 'Missing id')
    }

    console.log('[api/sleep/session] DELETE id=', id, 'userId=', userId)

    // Try to delete from sleep_logs
    const { data: deletedData, error } = await supabase
      .from('sleep_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
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

