import { Capacitor } from '@capacitor/core'

import { getMobileOAuthRedirectBaseFromEnv } from '@/lib/auth/mobileAuthDeepLink'

function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

function isHttpsAppOrigin(origin: string): boolean {
  return /^https?:\/\//i.test(origin)
}

/**
 * Public **app** origin used for OAuth return URL and **email confirmation** (`emailRedirectTo`).
 *
 * - **Web / default:** `NEXT_PUBLIC_OAUTH_REDIRECT_BASE` or `NEXT_PUBLIC_SITE_URL` or `window.location.origin`
 *   (e.g. `https://www.shiftcoach.app`) → callback path `/auth/callback`.
 * - **Capacitor native:** `NEXT_PUBLIC_MOBILE_OAUTH_REDIRECT_BASE` when set (e.g. `shiftcoach://auth`)
 *   → callback path `/callback` on that authority (see `buildOAuthRedirectTo`).
 *
 * Must match entries in **Supabase → Authentication → Redirect URLs** (both HTTPS and custom scheme
 * URLs as needed).
 *
 * **PKCE:** the code verifier lives in the Capacitor WebView `localStorage`. Start OAuth from this
 * same WebView (e.g. `window.location.assign` to the provider) so the return URL is handled here —
 * not a separate browser profile that cannot read that storage.
 */
export function getAuthAppOrigin(): string {
  if (typeof window === 'undefined') return ''

  const mobileBase = getMobileOAuthRedirectBaseFromEnv()
  if (isCapacitorNative() && mobileBase) return mobileBase

  const oauthBase =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE
      ? String(process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE).trim().replace(/\/$/, '')
      : ''
  const siteUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL
      ? String(process.env.NEXT_PUBLIC_SITE_URL).trim().replace(/\/$/, '')
      : ''
  return oauthBase || siteUrl || window.location.origin
}

/**
 * URL Supabase redirects the **browser / WebView** to after OAuth completes (session cookies / code exchange).
 */
export function buildOAuthRedirectTo(): string {
  const origin = getAuthAppOrigin()
  if (!origin) return ''
  if (isHttpsAppOrigin(origin)) {
    return `${origin}/auth/callback`
  }
  // Native custom scheme: include `next` in the URL — Path=/auth/callback cookies are not readable here.
  const next = encodeURIComponent('/auth/oauth-continue')
  return `${origin}/callback?next=${next}`
}

/**
 * After the user clicks **Confirm email**, Supabase redirects here; `/auth/callback` (web) or
 * `completeAuthFromDeepLink` (native) then sends them to sign-in with `email_confirmed=1`.
 */
export function buildEmailConfirmationRedirectTo(): string {
  const origin = getAuthAppOrigin()
  if (!origin) return ''
  const next = encodeURIComponent('/auth/sign-in')
  if (isHttpsAppOrigin(origin)) {
    return `${origin}/auth/callback?next=${next}`
  }
  return `${origin}/callback?next=${next}`
}
