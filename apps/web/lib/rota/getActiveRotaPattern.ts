'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export type RotaPatternConfig = {
  shiftLength: '8h' | '12h' | '16h'
  patternId: string
  patternSlots: string
  currentShiftIndex: number
  startDate: string
  colorConfig: {
    morning?: string | null
    afternoon?: string | null
    day?: string | null
    night?: string | null
    off?: string | null
  }
  notes?: string | null
}

const DEFAULT_CONFIG: RotaPatternConfig = {
  shiftLength: '12h',
  patternId: '',
  patternSlots: '',
  currentShiftIndex: 0,
  startDate: new Date().toISOString().slice(0, 10),
  colorConfig: {},
  notes: null,
}

export async function getActiveRotaPattern(): Promise<RotaPatternConfig | null> {
  const supabase = createClientComponentClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    if (authError) {
      console.error('[getActiveRotaPattern] auth error', authError)
    }
    return null
  }

  const { data, error } = await supabase
    .from('rota_patterns')
    .select('shift_length, pattern_id, pattern_slots, start_slot_index, start_date, color_config, notes')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[getActiveRotaPattern] query error', error)
    return null
  }

  if (!data) {
    return null
  }

  const patternSlots = typeof data.pattern_slots === 'string' ? data.pattern_slots : ''
  const colorConfig = (data.color_config as RotaPatternConfig['colorConfig']) ?? {}

  return {
    shiftLength: (data.shift_length as RotaPatternConfig['shiftLength']) ?? DEFAULT_CONFIG.shiftLength,
    patternId: data.pattern_id ?? DEFAULT_CONFIG.patternId,
    patternSlots,
    currentShiftIndex: typeof data.start_slot_index === 'number' ? data.start_slot_index : DEFAULT_CONFIG.currentShiftIndex,
    startDate: data.start_date ?? DEFAULT_CONFIG.startDate,
    colorConfig,
    notes: data.notes ?? null,
  }
}
