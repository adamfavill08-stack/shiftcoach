import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { predictSleepStages, type SleepStageInput } from '@/lib/sleep/predictSleepStages'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sleep/predict-stages
 * Predicts sleep stages for a given sleep session
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { startAt, endAt, quality, shiftType, sleepDebtHours } = body as {
      startAt: string
      endAt: string
      quality?: string | null
      shiftType?: string | null
      sleepDebtHours?: number
    }

    if (!startAt || !endAt) {
      return NextResponse.json({ error: 'Missing startAt or endAt' }, { status: 400 })
    }

    const sleepStart = new Date(startAt)
    const sleepEnd = new Date(endAt)
    const totalMinutes = Math.round((sleepEnd.getTime() - sleepStart.getTime()) / 60000)

    // Get user profile for age and sex
    const { data: profile } = await supabase
      .from('profiles')
      .select('sex, date_of_birth, age')
      .eq('user_id', userId)
      .maybeSingle()

    // Calculate age from date_of_birth or use stored age
    let age: number | null = profile?.age ?? null
    if (!age && profile?.date_of_birth) {
      const dob = new Date(profile.date_of_birth)
      const today = new Date()
      let calculatedAge = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        calculatedAge--
      }
      age = calculatedAge
    }

    const input: SleepStageInput = {
      totalMinutes,
      sleepStart,
      sleepEnd,
      quality: quality || null,
      shiftType: shiftType as any || null,
      age,
      sleepDebtHours: sleepDebtHours || 0,
    }

    const stages = predictSleepStages(input)

    return NextResponse.json({ stages }, { status: 200 })
  } catch (err: any) {
    console.error('[api/sleep/predict-stages] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to predict sleep stages' },
      { status: 500 }
    )
  }
}

