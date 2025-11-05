import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getCoachingState } from '@/lib/coach/getCoachingState'
import { getUserMetrics } from '@/lib/data/getUserMetrics'

/**
 * GET /api/coach/state
 * 
 * Returns the current coaching state for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // Fetch user metrics
    const metrics = await getUserMetrics(user.id, supabase)

    // Compute coaching state (normalize shift type to lowercase)
    const shiftTypeNormalized = metrics.shiftType
      ? (metrics.shiftType.toLowerCase() as 'day' | 'night' | 'late' | 'off')
      : null

    const coachingState = getCoachingState({
      bodyClockScore: metrics.bodyClockScore,
      recoveryScore: metrics.recoveryScore,
      sleepHoursLast24h: metrics.sleepHoursLast24,
      shiftType: shiftTypeNormalized,
      moodScore: metrics.moodScore,
      focusScore: metrics.focusScore,
    })

    return NextResponse.json({
      status: coachingState.status,
      label: coachingState.label,
      summary: coachingState.summary,
    })
  } catch (err: any) {
    console.error('[api/coach/state] Error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal error' },
      { status: 500 }
    )
  }
}

