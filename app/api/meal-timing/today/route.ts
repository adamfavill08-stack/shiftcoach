import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  try {
    const adjusted = await calculateAdjustedCalories(supabase, userId)

    let mealQuery = await supabase
      .from('meal_logs')
      .select('slot_label,logged_at')
      .eq('user_id', userId)
      .gte('logged_at', startOfDay.toISOString())
      .lt('logged_at', endOfDay.toISOString())

    if (mealQuery.error) {
      const err = mealQuery.error
      if (err.code === '42703' || err.message?.includes('logged_at')) {
        console.warn('[/api/meal-timing/today] meal_logs.logged_at missing, falling back to created_at')
        mealQuery = await supabase
          .from('meal_logs')
          .select('slot_label,created_at')
          .eq('user_id', userId)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
      }
    }

    const mealLogs = mealQuery.data ?? []

    return NextResponse.json(
      {
        meals: {
          shiftType: adjusted.shiftType,
          recommended: adjusted.meals,
          actual: mealLogs.map((row: any) => ({
            slot: row.slot_label,
            timestamp: row.logged_at ?? row.created_at ?? startOfDay.toISOString(),
          })),
        },
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('[/api/meal-timing/today] error:', err)
    return NextResponse.json(
      {
        meals: {
          shiftType: 'off',
          recommended: [],
          actual: [],
        },
      },
      { status: 200 },
    )
  }
}


