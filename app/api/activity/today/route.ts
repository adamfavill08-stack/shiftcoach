import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  const today = new Date().toISOString().slice(0, 10)

  try {
    const columnsWithActive = 'steps,active_minutes,last_synced_at,source,date'
    let activityResponse = await supabase
      .from('activity_logs')
      .select(columnsWithActive)
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    let activeMinutes: number | null = null

    if (activityResponse.error) {
      const err = activityResponse.error
      if (err.code === '42703' || err.message?.includes('active_minutes')) {
        console.warn('[/api/activity/today] active_minutes column missing, falling back without it')
        activityResponse = await supabase
          .from('activity_logs')
          .select('steps,last_synced_at,source,date')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle()
      } else if (err.message?.includes('relation')) {
        console.warn('[/api/activity/today] activity_logs table missing, returning stub.')
      } else {
        throw err
      }
    } else {
      activeMinutes = activityResponse.data?.active_minutes ?? null
    }

    const profileResponse = await supabase
      .from('profiles')
      .select('daily_steps_goal')
      .eq('user_id', userId)
      .maybeSingle()

    if (activityResponse.error && activityResponse.error.message?.includes('relation')) {
      console.warn('[/api/activity/today] activity_logs table missing, returning stub.')
    }

    if (activityResponse.error && !activityResponse.error.message?.includes('relation')) {
      throw activityResponse.error
    }

    const payload = {
      steps: activityResponse.data?.steps ?? 0,
      activeMinutes,
      lastSyncedAt: activityResponse.data?.last_synced_at ?? null,
      source: activityResponse.data?.source ?? 'Manual entry',
      goal: profileResponse.data?.daily_steps_goal ?? 10000,
      date: today,
    }

    return NextResponse.json({ activity: payload }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/activity/today] error:', err)
    return NextResponse.json(
      {
        activity: {
          steps: 0,
          activeMinutes: null,
          lastSyncedAt: null,
          source: 'Not connected',
          goal: 10000,
          date: today,
        },
      },
      { status: 200 },
    )
  }
}


