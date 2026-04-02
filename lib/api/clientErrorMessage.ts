/** Normalize API JSON error payloads (string, or `{ code, message }`) for display and Error(). */
export function apiErrorMessageFromJson(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const d = data as Record<string, unknown>
  const e = d.error
  if (typeof e === 'string') return e
  if (e && typeof e === 'object') {
    const errObj = e as Record<string, unknown>
    const msg = errObj.message
    const code = errObj.code
    if (typeof msg === 'string') return typeof code === 'string' ? `${code}: ${msg}` : msg
  }
  const top = d.message
  if (typeof top === 'string') return top
  return fallback
}
