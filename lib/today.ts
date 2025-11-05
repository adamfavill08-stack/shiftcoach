import { supabase } from './supabase'
import { isoLocalDate } from './shifts'

export async function getTodayShift() {
  const today = isoLocalDate(new Date())
  const { data, error } = await supabase.from('shifts').select('*').eq('date', today).single()
  if (error) return null
  return data
}

