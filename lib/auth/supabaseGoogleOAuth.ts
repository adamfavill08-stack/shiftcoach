/**
 * Google Cloud Console (OAuth 2.0 Web client used by Supabase) must list this exact URL under
 * **Authorized redirect URIs** — this is where Google returns after user consent, and Supabase exchanges the code.
 *
 * It is NOT the same as `buildOAuthRedirectTo()` (your app’s `/auth/callback`), which must be whitelisted
 * in **Supabase Dashboard → Authentication → Redirect URLs**.
 *
 * Example when `NEXT_PUBLIC_SUPABASE_URL` is `https://hfkittwgwvjdzvwzjvqqx.supabase.co`:
 *   https://hfkittwgwvjdzvwzjvqqx.supabase.co/auth/v1/callback
 */
export function getSupabaseGoogleOAuthCallbackUrl(supabaseUrl: string | undefined | null): string | null {
  if (!supabaseUrl || typeof supabaseUrl !== 'string') return null
  const base = supabaseUrl.replace(/\/$/, '')
  if (!base.startsWith('http')) return null
  return `${base}/auth/v1/callback`
}
