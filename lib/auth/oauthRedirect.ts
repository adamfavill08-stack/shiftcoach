/**
 * URL Supabase redirects the **browser / WebView** to after OAuth completes (session cookies / code exchange).
 *
 * Must appear in **Supabase → Authentication → Redirect URLs** exactly (per environment):
 *   https://www.shiftcoach.app/auth/callback
 *   http://localhost:3000/auth/callback  (optional, dev)
 *
 * **Google Cloud Console** must **not** use this as the only redirect — add Supabase’s callback instead:
 *   {NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback
 * See `getSupabaseGoogleOAuthCallbackUrl()` in `lib/auth/supabaseGoogleOAuth.ts`.
 *
 * Optional: if `NEXT_PUBLIC_OAUTH_REDIRECT_BASE` is set (e.g. https://www.shiftcoach.app), it overrides
 * `window.location.origin` for Capacitor builds where origin must be fixed to production.
 */
export function buildOAuthRedirectTo(): string {
  if (typeof window === 'undefined') return ''
  const override =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE
      ? String(process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE).replace(/\/$/, '')
      : ''
  const origin = override || window.location.origin
  return `${origin}/auth/callback`
}
