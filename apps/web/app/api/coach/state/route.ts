import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { getCoachingState } from '@/lib/coach/getCoachingState'
import { getUserMetrics } from '@/lib/data/getUserMetrics'

/**
 * GET /api/coach/state
 *
 * Returns the current coaching state for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()

    // Fetch user metrics
    let metrics
    try {
      metrics = await getUserMetrics(userId, supabase)
    } catch (metricsError: any) {
      console.error('[api/coach/state] Error fetching metrics:', metricsError)
      // Return default green state if metrics fail
      const defaultState = getCoachingState({
        bodyClockScore: null,
        recoveryScore: null,
        sleepHoursLast24h: null,
        shiftType: null,
        moodScore: null,
        focusScore: null,
      })
      return NextResponse.json({
        status: defaultState.status,
        label: defaultState.label,
        summary: defaultState.summary,
      })
    }

    // Compute coaching state (normalize shift type to lowercase)
    const shiftTypeNormalized = metrics.shiftType
      ? (metrics.shiftType.toLowerCase() as 'day' | 'night' | 'late' | 'off')
      : null

    let coachingState
    try {
      coachingState = getCoachingState({
        bodyClockScore: metrics.bodyClockScore,
        recoveryScore: metrics.recoveryScore,
        sleepHoursLast24h: metrics.sleepHoursLast24,
        shiftType: shiftTypeNormalized,
        moodScore: metrics.moodScore,
        focusScore: metrics.focusScore,
      })
    } catch (stateError: any) {
      console.error('[api/coach/state] Error computing state:', stateError)
      // Return default green state if state computation fails
      coachingState = getCoachingState({
        bodyClockScore: null,
        recoveryScore: null,
        sleepHoursLast24h: null,
        shiftType: null,
        moodScore: null,
        focusScore: null,
      })
    }

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

