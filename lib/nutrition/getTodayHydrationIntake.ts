export type HydrationIntake = {
  water_ml: number
  caffeine_mg: number
}

export async function getTodayHydrationIntake(supabase: any, userId: string): Promise<HydrationIntake> {
  // Sum water & caffeine from logs between UTC day start and next day
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))

  const [w, c] = await Promise.all([
    supabase
      .from('water_logs')
      .select('ml,ts')
      .eq('user_id', userId)
      .gte('ts', start.toISOString())
      .lt('ts', end.toISOString()),
    supabase
      .from('caffeine_logs')
      .select('mg,ts')
      .eq('user_id', userId)
      .gte('ts', start.toISOString())
      .lt('ts', end.toISOString()),
  ])

  const water_ml = (w.data ?? []).reduce((acc: number, r: any) => acc + (r.ml ?? 0), 0)
  const caffeine_mg = (c.data ?? []).reduce((acc: number, r: any) => acc + (r.mg ?? 0), 0)

  return { water_ml, caffeine_mg }
}


