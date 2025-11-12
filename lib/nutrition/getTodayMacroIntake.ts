export type MacroIntake = {
  protein_g: number
  carbs_g: number
  fat_g: number
  sat_fat_g?: number
}

export async function getTodayMacroIntake(supabase: any, userId: string): Promise<MacroIntake> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  let response = await supabase
    .from('meal_logs')
    .select('protein_g, carbs_g, fat_g, sat_fat_g, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay.toISOString())
    .lt('logged_at', endOfDay.toISOString())

  if (response.error) {
    const err = response.error
    if (err.code === '42703' || err.message?.includes('logged_at')) {
      console.warn('[getTodayMacroIntake] logged_at column missing, falling back to created_at')
      response = await supabase
        .from('meal_logs')
        .select('protein_g, carbs_g, fat_g, sat_fat_g, created_at')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
    }
  }

  if (response.error) {
    console.error('[getTodayMacroIntake] error:', response.error)
    return { protein_g: 0, carbs_g: 0, fat_g: 0, sat_fat_g: 0 }
  }

  const data = response.data ?? []

  const totals = data.reduce(
    (acc: MacroIntake, row: any) => {
      acc.protein_g += row?.protein_g ?? 0
      acc.carbs_g += row?.carbs_g ?? 0
      acc.fat_g += row?.fat_g ?? 0
      acc.sat_fat_g = (acc.sat_fat_g ?? 0) + (row?.sat_fat_g ?? 0)
      return acc
    },
    { protein_g: 0, carbs_g: 0, fat_g: 0, sat_fat_g: 0 },
  )

  return {
    protein_g: Math.round(totals.protein_g),
    carbs_g: Math.round(totals.carbs_g),
    fat_g: Math.round(totals.fat_g),
    sat_fat_g: Math.round(totals.sat_fat_g ?? 0),
  }
}


