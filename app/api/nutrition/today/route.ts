import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'
import { getTodayMacroIntake } from '@/lib/nutrition/getTodayMacroIntake'
import { getHydrationAndCaffeineTargets } from '@/lib/nutrition/getHydrationAndCaffeineTargets'

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('[/api/nutrition/today] auth error:', authError)
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await calculateAdjustedCalories(supabase, user.id)
    const consumed = await getTodayMacroIntake(supabase, user.id)
    const hydrationTargets = await getHydrationAndCaffeineTargets(supabase, user.id)
    return NextResponse.json({ 
      nutrition: { 
        ...result, 
        consumedMacros: consumed,
        hydrationTargets,
      } 
    }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/nutrition/today] error:', err)
    return NextResponse.json({ error: 'Failed to calculate calories' }, { status: 500 })
  }
}


