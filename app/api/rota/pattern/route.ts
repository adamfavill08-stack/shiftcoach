import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { inferShiftPattern } from '@/lib/rota/inferShiftPattern'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    // This is needed because RLS policies check auth.uid(), which is null without a real session
    const supabase = isDevFallback ? supabaseServer : authSupabase

    const body = await req.json().catch(() => null)

    console.log('[api/rota/pattern] incoming body', body)

    if (!body) {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
    }

    const {
      shiftLength,
      patternId,
      patternSlots,
      currentShiftIndex,
      startDate,
      colorConfig,
      notes,
    } = body

    if (!shiftLength || !patternId || !Array.isArray(patternSlots) || currentShiftIndex === undefined || !startDate) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          detail: {
            shiftLength,
            patternId,
            patternSlots,
            currentShiftIndex,
            startDate,
          },
        },
        { status: 400 },
      )
    }

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
        shift_length: shiftLength,
        pattern_id: patternId,
        pattern_slots: patternSlots,
        current_shift_index: currentShiftIndex,
        start_date: startDate,
        color_config: colorConfig ?? {},
        notes: notes ?? null,
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
    if (patternSlots && Array.isArray(patternSlots) && patternSlots.length > 0) {
      try {
        console.log('[api/rota/pattern] patternSlots received:', patternSlots)
        const inferredPattern = inferShiftPattern(patternSlots as any)
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
      shift_pattern_updated: patternSlots && Array.isArray(patternSlots) && patternSlots.length > 0
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/rota/pattern] fatal POST error', {
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

export async function DELETE(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
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
