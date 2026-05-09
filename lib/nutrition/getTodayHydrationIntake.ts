import { getHydrationDayWindow } from '@/lib/hydration/hydrationDayWindow'

export type HydrationIntake = {
  water_ml: number
  caffeine_mg: number
}

/**
 * Sum water & caffeine in the current hydration “day” (05:00→05:00 local in `timeZone`).
 * Pass the same IANA zone the client sends on `/api/nutrition/today?tz=`.
 */
export async function getTodayHydrationIntake(
  supabase: any,
  userId: string,
  timeZone = 'UTC',
): Promise<HydrationIntake> {
  const now = new Date()
  const { start, end } = getHydrationDayWindow(now, timeZone)
  const startIso = start.toISOString()
  const endIso = end.toISOString()

  const [w, c] = await Promise.all([
    supabase.from('water_logs').select('ml,ts').eq('user_id', userId).gte('ts', startIso).lt('ts', endIso),
    supabase.from('caffeine_logs').select('mg,ts').eq('user_id', userId).gte('ts', startIso).lt('ts', endIso),
  ])

  const water_ml = (w.data ?? []).reduce((acc: number, r: any) => acc + (Number(r.ml) || 0), 0)
  const caffeine_mg = (c.data ?? []).reduce((acc: number, r: any) => acc + (Number(r.mg) || 0), 0)

  return { water_ml, caffeine_mg }
}


