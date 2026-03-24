import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { inferShiftPattern } from '@/lib/rota/inferShiftPattern'
import { getPatternSlots } from '@/lib/rota/patternSlots'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError, apiBadRequest } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

const RotaPatternSchema = z.object({
  shiftLength: z.union([z.string().min(1), z.number().int().positive()]).optional(),
  patternId: z.string().min(1).optional(),
  patternSlots: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      }
      return []
    }),
  currentShiftIndex: z.preprocess((value) => {
    if (value === null || value === undefined || value === '') return 0
    const num = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(num) ? num : 0
  }, z.number().int().min(0)),
  startDate: z.string().min(1).optional(),
  colorConfig: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().nullable().optional(),
})

function normalizeShiftLength(value: string | number | undefined): '8h' | '12h' | '16h' {
  if (value === undefined) return '12h'
  if (typeof value === 'number') {
    if (value === 8 || value === 12 || value === 16) return `${value}h` as '8h' | '12h' | '16h'
    return '12h'
  }

  const trimmed = value.trim().toLowerCase()
  if (trimmed === '8h' || trimmed === '12h' || trimmed === '16h') return trimmed
  if (trimmed === '8' || trimmed === '12' || trimmed === '16') return `${trimmed}h` as '8h' | '12h' | '16h'

  // Legacy table constraint only permits 8h/12h/16h.
  return '12h'
}

export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    // Use service role client (bypasses RLS) when in dev fallback mode
    // This is needed because RLS policies check auth.uid(), which is null without a real session
    const supabase = isDevFallback ? supabaseServer : authSupabase

    const parsed = await parseJsonBody(req, RotaPatternSchema)
    if (!parsed.ok) return parsed.response
    const {
      shiftLength,
      patternId,
      patternSlots,
      currentShiftIndex,
      startDate,
      colorConfig,
      notes,
    } = parsed.data

    const normalizedPatternId = patternId?.trim() || '12h-2d-2n-4off'
    const normalizedPatternSlots =
      Array.isArray(patternSlots) && patternSlots.length > 0 ? patternSlots : getPatternSlots(normalizedPatternId)
    const normalizedStartDate = startDate?.trim() || new Date().toISOString().slice(0, 10)

    if (!Array.isArray(normalizedPatternSlots) || normalizedPatternSlots.length === 0) {
      return apiBadRequest('invalid_pattern_slots', 'patternSlots must include at least one slot')
    }

    const normalizedShiftLength = normalizeShiftLength(shiftLength)

    const { error: deleteError } = await supabase
      .from('user_shift_patterns')
      .delete()
      .eq('user_id', userId)

    if (deleteError && !deleteError.message?.includes('relation')) {
      console.error('[api/rota/pattern] delete error', deleteError)
    }

    const { data, error: insertError } = await supabase
      .from('user_shift_patterns')
      .insert({
        user_id: userId,
        shift_length: normalizedShiftLength,
        pattern_id: normalizedPatternId,
        pattern_slots: normalizedPatternSlots,
        current_shift_index: currentShiftIndex,
        start_date: normalizedStartDate,
        color_config: colorConfig ?? {},
        notes: typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : null,
      })
      .select()
      .maybeSingle()

    if (insertError) {
      console.error('[api/rota/pattern] insert error', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        fullError: insertError,
      })
      return NextResponse.json(
        {
          error: 'Failed to save rota pattern',
          detail: insertError.message ?? String(insertError),
          code: insertError.code,
        },
        { status: 500 },
      )
    }

    console.log('[api/rota/pattern] saved pattern', data)

    // Auto-update shift_pattern in profiles based on the pattern
    if (normalizedPatternSlots && Array.isArray(normalizedPatternSlots) && normalizedPatternSlots.length > 0) {
      try {
        console.log('[api/rota/pattern] patternSlots received:', normalizedPatternSlots)
        const inferredPattern = inferShiftPattern(normalizedPatternSlots as any)
        console.log('[api/rota/pattern] inferred pattern:', inferredPattern)
        
        const { data: updateData, error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ shift_pattern: inferredPattern })
          .eq('user_id', userId)
          .select()

        if (profileUpdateError) {
          console.error('[api/rota/pattern] failed to update shift_pattern in profile:', {
            error: profileUpdateError,
            userId,
            inferredPattern,
          })
          // Don't fail the request if profile update fails
        } else {
          console.log('[api/rota/pattern] successfully auto-updated shift_pattern to:', inferredPattern, 'for user:', userId)
          // Note: The client-side code will dispatch 'rota-saved' event after this response
        }
      } catch (inferError) {
        console.error('[api/rota/pattern] error inferring or updating shift_pattern:', inferError)
        // Don't fail the request
      }
    } else {
      console.warn('[api/rota/pattern] patternSlots missing or invalid:', patternSlots)
    }

    return NextResponse.json({ 
      success: true, 
      pattern: data,
      shift_pattern_updated: normalizedPatternSlots && Array.isArray(normalizedPatternSlots) && normalizedPatternSlots.length > 0
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/rota/pattern] fatal POST error', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      fullError: err,
    })
    return apiServerError('unexpected_error', err?.message || 'Unexpected server error')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase

    const { error: deleteError } = await supabase
      .from('user_shift_patterns')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[api/rota/pattern] delete error', deleteError)
      return NextResponse.json({ error: 'Failed to delete pattern' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[api/rota/pattern] fatal DELETE error', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      fullError: err,
    })
    return NextResponse.json(
      { 
        error: 'Unexpected server error', 
        detail: err?.message || String(err),
        name: err?.name,
      },
      { status: 500 },
    )
  }
}
