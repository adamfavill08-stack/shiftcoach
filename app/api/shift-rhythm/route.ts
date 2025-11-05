import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { calculateShiftRhythm } from '@/lib/shift/calculateShiftRhythm'

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[/api/shift-rhythm] auth error:', authError)
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    // Try to get today's score and yesterday's score for comparison
    const [{ data: existing, error: fetchErr }, { data: yesterdayScore }] = await Promise.all([
      supabase
        .from('shift_rhythm_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('shift_rhythm_scores')
        .select('total_score')
        .eq('user_id', user.id)
        .eq('date', yesterday)
        .maybeSingle(),
    ])

    if (fetchErr) {
      console.error('[/api/shift-rhythm] fetch error:', fetchErr)
      
      // If table doesn't exist, return null instead of error
      if (fetchErr.message?.includes('relation') || fetchErr.message?.includes('does not exist')) {
        console.warn('[/api/shift-rhythm] Table does not exist yet:', fetchErr.message)
        return NextResponse.json({ score: null }, { status: 200 })
      }
    }

    let score = existing

    // If no score, calculate and store it
    if (!score) {
      console.log('[/api/shift-rhythm] No score for today, calculating…')

      try {
        const result = await calculateShiftRhythm(supabase, user.id)

        const { data: inserted, error: upsertErr } = await supabase
          .from('shift_rhythm_scores')
          .upsert({
            user_id: user.id,
            date: result.date,
            sleep_score: result.sleep_score,
            regularity_score: result.regularity_score,
            shift_pattern_score: result.shift_pattern_score,
            recovery_score: result.recovery_score,
            total_score: result.total_score,
          }, { onConflict: 'user_id,date' })
          .select()
          .maybeSingle()

        if (upsertErr) {
          console.error('[/api/shift-rhythm] upsert error:', upsertErr)
          
          // If table doesn't exist, return null
          if (upsertErr.message?.includes('relation') || upsertErr.message?.includes('does not exist')) {
            console.warn('[/api/shift-rhythm] Table does not exist yet:', upsertErr.message)
            return NextResponse.json({ score: null }, { status: 200 })
          }
          
          return NextResponse.json(
            { error: 'Failed to save shift rhythm score', details: upsertErr.message },
            { status: 500 }
          )
        }

        score = inserted
      } catch (calcErr: any) {
        console.error('[/api/shift-rhythm] Calculation error:', calcErr)
        // Return null if calculation fails, don't crash
        return NextResponse.json({ score: null }, { status: 200 })
      }
    }

    // Include yesterday's score for comparison
    const response: any = { score }
    if (yesterdayScore?.total_score !== undefined) {
      response.yesterdayScore = yesterdayScore.total_score
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err: any) {
    console.error('[/api/shift-rhythm] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[/api/shift-rhythm:POST] auth error:', authError)
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await calculateShiftRhythm(supabase, user.id)

    const { data: upserted, error: upsertErr } = await supabase
      .from('shift_rhythm_scores')
      .upsert({
        user_id: user.id,
        date: result.date,
        sleep_score: result.sleep_score,
        regularity_score: result.regularity_score,
        shift_pattern_score: result.shift_pattern_score,
        recovery_score: result.recovery_score,
        total_score: result.total_score,
      }, { onConflict: 'user_id,date' })
      .select()
      .maybeSingle()

    if (upsertErr) {
      console.error('[/api/shift-rhythm:POST] upsert error:', upsertErr)
      
      // If table doesn't exist, return helpful error
      if (upsertErr.message?.includes('relation') || upsertErr.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Table not found',
            message: 'Please run the SQL migration: supabase-shift-rhythm-scores.sql',
            details: upsertErr.message,
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to save shift rhythm score', details: upsertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, score: upserted },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[/api/shift-rhythm:POST] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })

    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

