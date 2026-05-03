/** True when PostgREST/Supabase reports an unknown or uncached column (incl. `ts` vs `created_at` drift). */
export function isPostgrestSchemaColumnError(e: { code?: string; message?: string } | null): boolean {
  if (!e) return false
  const m = String(e.message ?? '').toLowerCase()
  return (
    e.code === '42703' ||
    e.code === 'PGRST204' ||
    m.includes('schema cache') ||
    (m.includes('could not find') && m.includes('column'))
  )
}
