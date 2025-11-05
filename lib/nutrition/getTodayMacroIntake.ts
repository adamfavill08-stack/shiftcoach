export type MacroIntake = {
  protein_g: number
  carbs_g: number
  fat_g: number
  sat_fat_g?: number
}

export async function getTodayMacroIntake(supabase: any, userId: string): Promise<MacroIntake> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('meal_logs')
    .select('protein_g, carbs_g, fat_g, sat_fat_g, calories')
    .eq('user_id', userId)
    .eq('date', today)

  if (error) {
    console.error('[getTodayMacroIntake] error:', error)
    return { protein_g: 0, carbs_g: 0, fat_g: 0 }
  }

  const totals = (data ?? []).reduce(
    (acc: MacroIntake, row: any) => {
      acc.protein_g += row?.protein_g ?? 0
      acc.carbs_g += row?.carbs_g ?? 0
      acc.fat_g += row?.fat_g ?? 0
      // optional if column exists
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


