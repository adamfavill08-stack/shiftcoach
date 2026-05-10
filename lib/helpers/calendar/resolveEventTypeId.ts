import type { SupabaseClient } from '@supabase/supabase-js'

/** Resolve event_types.id; falls back to first row or 1. */
export async function resolveEventTypeId(
  supabase: SupabaseClient,
  requestedEventType?: number,
): Promise<number> {
  if (typeof requestedEventType === 'number' && Number.isFinite(requestedEventType) && requestedEventType > 0) {
    const { data: existing } = await supabase
      .from('event_types')
      .select('id')
      .eq('id', requestedEventType)
      .maybeSingle()
    if (existing?.id) return existing.id
  }
  const { data: fallback } = await supabase
    .from('event_types')
    .select('id')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()
  return fallback?.id ?? 1
}
