import { Capacitor } from '@capacitor/core'

function trimOrigin(value: string): string {
  return value.trim().replace(/\/$/, '')
}

/**
 * Public **app** origin for OAuth return URL and **email confirmation** (`emailRedirectTo`).
 *
 * - **Capacitor native (runtime):** always `shiftcoach://auth` → `/callback` paths (see below).
 * - **Web:** `NEXT_PUBLIC_OAUTH_REDIRECT_BASE` or `NEXT_PUBLIC_SITE_URL` or `window.location.origin`,
 *   or `http://localhost:3000` during SSR when env is unset.
 *
 * Add **`shiftcoach://auth/callback`** and your HTTPS **`…/auth/callback`** to **Supabase → Redirect URLs**.
 *
 * **PKCE:** keep OAuth in the same Capacitor WebView so `localStorage` holds the verifier.
 */
export function getAuthAppOrigin(): string {
  const isNative = Capacitor.isNativePlatform()

  if (isNative) {
    return 'shiftcoach://auth'
  }

  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE) {
    return trimOrigin(String(process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE))
  }

  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) {
    return trimOrigin(String(process.env.NEXT_PUBLIC_SITE_URL))
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return 'http://localhost:3000'
}

function isNativeAuthOrigin(origin: string): boolean {
  return origin.startsWith('shiftcoach://')
}

/**
 * URL Supabase redirects to after OAuth completes.
 */
export function buildOAuthRedirectTo(): string {
  const origin = getAuthAppOrigin()
  if (!origin) return ''
  if (isNativeAuthOrigin(origin)) {
    const next = encodeURIComponent('/auth/oauth-continue')
    return `${origin}/callback?next=${next}`
  }
  return `${origin}/auth/callback`
}

/**
 * After **Confirm email**, Supabase redirects here; web uses `/auth/callback`, native uses
 * `completeAuthFromDeepLink` on `shiftcoach://auth/callback`.
 */
export function buildEmailConfirmationRedirectTo(): string {
  const origin = getAuthAppOrigin()
  const next = encodeURIComponent('/auth/sign-in')

  if (isNativeAuthOrigin(origin)) {
    return `${origin}/callback?next=${next}`
  }

  return `${origin}/auth/callback?next=${next}`
}
