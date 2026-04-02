import type { SupabaseClient } from '@supabase/supabase-js'
import type { ShiftCode } from './patternCatalog'
import type { ShiftSlot as SlotLetter } from '@/lib/rota/patternSlots'
import { buildConcreteShiftsRows, shiftDateKeyLocal } from '@/lib/rota/buildConcreteShifts'
import { getPatternSlots } from '@/lib/rota/patternSlots'
import { inferShiftPattern } from '@/lib/rota/inferShiftPattern'

function rotaShiftTypeFromSlot(slot: SlotLetter): ShiftCode {
  if (slot === 'O') return 'off'
  if (slot === 'N') return 'night'
  if (slot === 'M' || slot === 'A' || slot === 'D') return 'day'
  return 'other'
}

export type ApplyRotaPatternArgs = {
  supabase: SupabaseClient
  userId: string
  startDate: Date
  patternId: string
  startCycleIndex?: number
  daysToGenerate?: number
  /**
   * Write `shifts` rows for the agent and APIs (same slot logic as /api/rota/apply).
   * Default 8 weeks from max(today, pattern start). Set 0 to skip.
   */
  materializeShiftsWeeks?: number
  shiftTimes?: Record<string, { start?: string; end?: string }>
  commute?: unknown
}

function toISODate(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export async function applyRotaPattern({
  supabase,
  userId,
  startDate,
  patternId,
  startCycleIndex = 0,
  daysToGenerate = 365,
  materializeShiftsWeeks = 8,
  shiftTimes,
  commute,
}: ApplyRotaPatternArgs) {
  const patternSlotLetters = getPatternSlots(patternId)
  if (!patternSlotLetters.length) {
    console.warn('[applyRotaPattern] empty slot list for pattern', { patternId })
    return
  }

  const L = patternSlotLetters.length
  const entries: { user_id: string; date: string; shift_type: ShiftCode }[] = []

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  for (let i = 0; i < daysToGenerate; i += 1) {
    const currentDate = new Date(start)
    currentDate.setDate(start.getDate() + i)

    const shiftIndex = (((startCycleIndex + i) % L) + L) % L
    const slot = patternSlotLetters[shiftIndex]

    entries.push({
      user_id: userId,
      date: toISODate(currentDate),
      shift_type: rotaShiftTypeFromSlot(slot),
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

  const weeks = materializeShiftsWeeks ?? 0
  if (weeks <= 0) {
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const patternStart = new Date(startDate)
  patternStart.setHours(0, 0, 0, 0)
  const generateStart = patternStart > today ? patternStart : today

  const dayCount = weeks * 7
  const rangeEnd = new Date(generateStart)
  rangeEnd.setDate(rangeEnd.getDate() + dayCount - 1)

  const fromIso = shiftDateKeyLocal(generateStart)
  const toIso = shiftDateKeyLocal(rangeEnd)

  const { error: shiftDeleteError } = await supabase
    .from('shifts')
    .delete()
    .eq('user_id', userId)
    .gte('date', fromIso)
    .lte('date', toIso)

  if (shiftDeleteError) {
    console.error('[applyRotaPattern] shifts delete error', shiftDeleteError)
    throw shiftDeleteError
  }

  const shiftRows = buildConcreteShiftsRows({
    userId,
    patternId,
    patternStart,
    startCycleIndex,
    rangeStart: generateStart,
    dayCount,
    shiftTimes,
    commute,
  })

  if (shiftRows.length > 0) {
    const { error: shiftUpsertError } = await supabase
      .from('shifts')
      .upsert(shiftRows, { onConflict: 'user_id,date' })

    if (shiftUpsertError) {
      console.error('[applyRotaPattern] shifts upsert error', shiftUpsertError)
      throw shiftUpsertError
    }
  }

  try {
    const inferredPattern = inferShiftPattern(patternSlotLetters as ('M' | 'A' | 'D' | 'N' | 'O')[])
    await supabase.from('profiles').update({ shift_pattern: inferredPattern }).eq('user_id', userId)
  } catch (profileErr) {
    console.warn('[applyRotaPattern] profile shift_pattern update skipped', profileErr)
  }
}
