import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import { getTodayMacroIntake } from '@/lib/nutrition/getTodayMacroIntake'
import { getHydrationAndCaffeineTargets } from '@/lib/nutrition/getHydrationAndCaffeineTargets'
import { getTodayHydrationIntake } from '@/lib/nutrition/getTodayHydrationIntake'

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  try {
    const [calorieResult, consumedMacros, hydrationTargets, hydrationIntake] = await Promise.all([
      calculateAdjustedCalories(supabase, userId).catch((err: unknown) => {
        console.error('[/api/nutrition/today] calculateAdjustedCalories error', err)
        return null
      }),
      getTodayMacroIntake(supabase, userId).catch((err: unknown) => {
        console.error('[/api/nutrition/today] getTodayMacroIntake error', err)
        return { protein_g: 0, carbs_g: 0, fat_g: 0, sat_fat_g: 0 }
      }),
      getHydrationAndCaffeineTargets(supabase, userId).catch((err: unknown) => {
        console.error('[/api/nutrition/today] hydration targets error', err)
        return { water_ml: 2500, caffeine_mg: 300 }
      }),
      getTodayHydrationIntake(supabase, userId).catch((err: unknown) => {
        console.error('[/api/nutrition/today] hydration intake error', err)
        return { water_ml: 0, caffeine_mg: 0 }
      }),
    ])

    if (!calorieResult) {
      return NextResponse.json({ error: 'Unable to compute calories' }, { status: 500 })
    }

    return NextResponse.json(
      {
        nutrition: {
          ...calorieResult,
          consumedMacros,
          hydrationTargets,
          hydrationIntake,
        },
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('[/api/nutrition/today] error:', err)
    return NextResponse.json({ error: 'Failed to calculate calories' }, { status: 500 })
  }
}


