import { parseOtpType } from '@/lib/auth/emailOtpTypes'
import { isMobileAuthCallbackUrl } from '@/lib/auth/mobileAuthDeepLink'
import { supabase } from '@/lib/supabase'

export type CompleteAuthFromDeepLinkResult =
  | { ok: true; navigate: string }
  | { ok: false; navigate: string }

function safeInternalNext(next: string | null, fallback: string): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next
  return fallback
}

/**
 * Finish Supabase auth when the app opens `shiftcoach://auth/callback?...` (or equivalent).
 * Mirrors `app/auth/callback/route.ts` for client-side PKCE + session in the Capacitor WebView.
 */
export async function completeAuthFromDeepLink(
  url: string,
): Promise<CompleteAuthFromDeepLinkResult> {
  if (!isMobileAuthCallbackUrl(url)) {
    return { ok: false, navigate: '/auth/sign-in?error=invalid_callback' }
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, navigate: '/auth/sign-in?error=invalid_callback' }
  }

  const error = parsed.searchParams.get('error')
  const errorDescription = parsed.searchParams.get('error_description')
  if (error) {
    const msg = errorDescription || error
    return {
      ok: false,
      navigate: `/auth/sign-in?error=${encodeURIComponent(msg)}`,
    }
  }

  const code = parsed.searchParams.get('code')
  const tokenHash = parsed.searchParams.get('token_hash')
  const typeRaw = parsed.searchParams.get('type')
  const nextDefault = '/auth/oauth-continue'
  const next = safeInternalNext(parsed.searchParams.get('next'), nextDefault)

  if (!code && !(tokenHash && typeRaw)) {
    return { ok: false, navigate: '/auth/sign-in?error=missing_code' }
  }

  try {
    if (code) {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(url)
      if (exchangeError) {
        return {
          ok: false,
          navigate: `/auth/sign-in?error=${encodeURIComponent(
            exchangeError.message || 'Invalid or expired confirmation link',
          )}`,
        }
      }
      if (!data.session) {
        return {
          ok: false,
          navigate: '/auth/sign-in?error=' + encodeURIComponent('Failed to create session.'),
        }
      }
    } else {
      const otpType = parseOtpType(typeRaw)
      if (!otpType || !tokenHash) {
        return { ok: false, navigate: '/auth/sign-in?error=invalid_link' }
      }
      const { error: otpError } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      })
      if (otpError) {
        return {
          ok: false,
          navigate: `/auth/sign-in?error=${encodeURIComponent(
            otpError.message || 'Invalid or expired confirmation link',
          )}`,
        }
      }
    }

    const nextUrl = new URL(next, 'https://www.shiftcoach.app')
    const wantsSignIn = nextUrl.pathname.startsWith('/auth/sign-in')
    if (wantsSignIn) {
      nextUrl.searchParams.set('email_confirmed', '1')
      await supabase.auth.signOut()
      const path = `${nextUrl.pathname}${nextUrl.search}`
      return { ok: true, navigate: path }
    }

    return { ok: true, navigate: next }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unexpected_error'
    return {
      ok: false,
      navigate: `/auth/sign-in?error=${encodeURIComponent(message)}`,
    }
  }
}
