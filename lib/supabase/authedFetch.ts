import { getClientAppLocaleForApi } from '@/lib/i18n/clientLocaleForApi'
import { supabase } from '@/lib/supabase'

/**
 * Browser fetch that attaches the current Supabase access token so Route Handlers
 * can authenticate even when session cookies are not yet visible on the request
 * (common right after sign-in or on first navigation).
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  if (!headers.has('X-ShiftCoach-Locale')) {
    headers.set('X-ShiftCoach-Locale', getClientAppLocaleForApi())
  }
  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers,
  })
}
