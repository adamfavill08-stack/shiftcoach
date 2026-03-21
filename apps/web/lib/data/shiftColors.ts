import type { SupabaseClient } from '@supabase/supabase-js'

export type ShiftColorConfig = {
  day: string
  night: string
  off: string
  other: string
  custom?: string
}

export const DEFAULT_SHIFT_COLORS: ShiftColorConfig = {
  day: '#2563EB',
  night: '#EF4444',
  off: '#22C55E',
  other: '#FACC15',
  custom: '#FACC15',
}

export async function getActiveShiftColors(
  supabase: SupabaseClient,
  userId: string,
): Promise<ShiftColorConfig> {
  const { data: patternRow, error: patternError } = await supabase
    .from('rota_patterns')
    .select('id, color_config')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  const patternMessage = typeof patternError?.message === 'string' ? patternError.message.trim() : ''

  if (patternError) {
    if (
      patternMessage &&
      !patternMessage.includes('relation') &&
      !patternMessage.includes('does not exist') &&
      !patternMessage.includes('Does not exist')
    ) {
      console.error('[shiftColors] patternError', {
        userId,
        message: patternMessage,
        details: (patternError as any)?.details,
      })
    }

    return DEFAULT_SHIFT_COLORS
  }

  const defaultColors: ShiftColorConfig = { ...DEFAULT_SHIFT_COLORS }

  if (!patternRow || !patternRow.color_config) {
    console.warn('[shiftColors] No active rota pattern colours found for user', { userId })
    return defaultColors
  }

  const mergedFromPattern: ShiftColorConfig = {
    ...defaultColors,
    ...(patternRow.color_config as Partial<ShiftColorConfig>),
  }

  const { data: prefsRow, error: prefsError } = await supabase
    .from('shift_color_preferences')
    .select('colors, day_color, night_color, off_color, other_color')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const prefsMessage = typeof prefsError?.message === 'string' ? prefsError.message.trim() : ''

  if (prefsError && prefsMessage && !prefsMessage.includes('relation')) {
    console.error('[shiftColors] prefsError', prefsError)
  }

  if (prefsRow?.colors) {
    return {
      ...mergedFromPattern,
      ...(prefsRow.colors as Partial<ShiftColorConfig>),
    }
  }

  if (prefsRow) {
    return {
      ...mergedFromPattern,
      day: prefsRow.day_color ?? mergedFromPattern.day,
      night: prefsRow.night_color ?? mergedFromPattern.night,
      off: prefsRow.off_color ?? mergedFromPattern.off,
      other: prefsRow.other_color ?? mergedFromPattern.other,
    }
  }

  if (!prefsMessage) {
    console.warn('[shiftColors] No shift colour preferences found for user', { userId })
  }

  return mergedFromPattern
}

export async function saveActiveShiftColors(
  supabase: SupabaseClient,
  userId: string,
  colors: ShiftColorConfig,
  options?: {
    patternId?: string
    startDate?: string
    startSlotIndex?: number
  },
) {
  const { data: patternRow, error: patternError } = await supabase
    .from('rota_patterns')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (patternError) {
    const message = typeof patternError.message === 'string' ? patternError.message.trim() : ''

    if (!message.includes('relation')) {
      console.error('[shiftColors] pattern lookup error', {
        userId,
        message: message || patternError,
        details: (patternError as any)?.details,
      })
    }

    return
  }

  const { patternId, startDate, startSlotIndex } = options ?? {}

  if (!patternRow || !patternRow.id) {
    if (!patternId) {
      console.warn('[shiftColors] No active rota pattern found for user when saving colours', {
        userId,
      })
      return
    }

    const insertPayload = {
      user_id: userId,
      pattern_id: patternId,
      start_date: startDate ?? new Date().toISOString().slice(0, 10),
      start_slot_index: startSlotIndex ?? 0,
      color_config: colors,
      is_active: true,
    }

    const { error: insertError } = await supabase.from('rota_patterns').insert(insertPayload)

    if (insertError) {
      console.error('[shiftColors] failed to insert rota pattern', insertError)
    }

    return
  }

  const updates: Record<string, unknown> = {
    color_config: colors,
    updated_at: new Date().toISOString(),
  }

  if (patternId) {
    updates.pattern_id = patternId
  }

  if (startDate) {
    updates.start_date = startDate
  }

  if (typeof startSlotIndex === 'number') {
    updates.start_slot_index = startSlotIndex
  }

  const { error: updateError } = await supabase
    .from('rota_patterns')
    .update(updates)
    .eq('id', patternRow.id)

  if (updateError) {
    console.error('[shiftColors] failed to update rota pattern', updateError)
  }
}
