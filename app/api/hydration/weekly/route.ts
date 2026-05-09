import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { getHydrationAndCaffeineTargets } from '@/lib/nutrition/getHydrationAndCaffeineTargets'
import { buildWeeklyHydrationBarsPayload } from '@/lib/hydration/weeklyHydrationBars'
import { resolveIanaTimeZoneParam } from '@/lib/hydration/resolveIanaTimeZoneParam'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  const tz = resolveIanaTimeZoneParam(req.nextUrl.searchParams.get('tz'))

  try {
    const targets = await getHydrationAndCaffeineTargets(supabase, userId)
    const payload = await buildWeeklyHydrationBarsPayload(supabase, userId, tz, targets.water_ml, new Date())
    return NextResponse.json(payload, { status: 200 })
  } catch (err: unknown) {
    console.error('[/api/hydration/weekly]', err)
    return NextResponse.json({ error: 'Failed to load hydration week' }, { status: 500 })
  }
}
