import type { SupabaseClient } from '@supabase/supabase-js'
import { getPatternCycle, type ShiftCode } from './patternCatalog'

export type ApplyRotaPatternArgs = {
  supabase: SupabaseClient
  userId: string
  startDate: Date
  patternId: string
  startCycleIndex?: number
  daysToGenerate?: number
}

function toISODate(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

export async function applyRotaPattern({
  supabase,
  userId,
  startDate,
  patternId,
  startCycleIndex = 0,
  daysToGenerate = 365,
}: ApplyRotaPatternArgs) {
  const cycle = getPatternCycle(patternId)
  if (!cycle || cycle.length === 0) {
    console.warn('[applyRotaPattern] empty cycle for pattern', { patternId })
    return
  }

  const entries: { user_id: string; date: string; shift_type: ShiftCode }[] = []

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  for (let i = 0; i < daysToGenerate; i += 1) {
    const currentDate = new Date(start)
    currentDate.setDate(start.getDate() + i)

    const shiftIndex = (startCycleIndex + i) % cycle.length
    const shiftType = cycle[shiftIndex]

    entries.push({
      user_id: userId,
      date: toISODate(currentDate),
      shift_type: shiftType,
    })
  }

  const startIso = toISODate(start)

  const { error: deleteError } = await supabase
    .from('rota_days')
    .delete()
    .eq('user_id', userId)
    .gte('date', startIso)

  if (deleteError) {
    console.error('[applyRotaPattern] delete error', deleteError)
    throw deleteError
  }

  if (!entries.length) {
    return
  }

  const { error } = await supabase.from('rota_days').upsert(entries, { onConflict: 'user_id,date' })

  if (error) {
    console.error('[applyRotaPattern] upsert error', error)
    throw error
  }
}
