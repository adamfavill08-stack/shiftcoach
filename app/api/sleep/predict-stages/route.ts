import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { predictSleepStages, type SleepStageInput } from '@/lib/sleep/predictSleepStages'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

const PredictStagesSchema = z.object({
  startAt: z.string(),
  endAt: z.string(),
  quality: z.string().nullable().optional(),
  shiftType: z.string().nullable().optional(),
  sleepDebtHours: z.number().optional(),
})

/**
 * POST /api/sleep/predict-stages
 * Predicts sleep stages for a given sleep session
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) return buildUnauthorizedResponse()


    const parsed = await parseJsonBody(req, PredictStagesSchema)
    if (!parsed.ok) return parsed.response
    const { startAt, endAt, quality, shiftType, sleepDebtHours } = parsed.data

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
    return apiServerError('predict_stages_failed', err?.message || 'Failed to predict sleep stages')
  }
}

