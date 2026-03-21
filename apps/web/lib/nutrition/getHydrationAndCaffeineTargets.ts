export type HydrationCaffeineTargets = {
  water_ml: number
  caffeine_mg: number
}

export async function getHydrationAndCaffeineTargets(supabase: any, userId: string): Promise<HydrationCaffeineTargets> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('weight_kg')
    .eq('user_id', userId)
    .maybeSingle()

  const weight = profile?.weight_kg ?? 75

  const waterBase = weight * 35 // ml
  const caffeineBase = Math.min(weight * 3, 400) // mg cap at 400

  return {
    water_ml: Math.round(waterBase),
    caffeine_mg: Math.round(caffeineBase),
  }
}


