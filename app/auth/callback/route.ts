import type { EmailOtpType } from '@supabase/supabase-js'
import { getSupabaseServer } from '@/lib/supabase-server-auth'
import { NextRequest, NextResponse } from 'next/server'

const OTP_TYPES = new Set<string>([
  'signup',
  'email',
  'invite',
  'recovery',
  'magiclink',
  'email_change',
])

function parseOtpType(type: string | null): EmailOtpType | null {
  if (!type || !OTP_TYPES.has(type)) return null
  return type as EmailOtpType
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const typeRaw = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/auth/sign-in'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('[auth/callback] OAuth error:', { error, errorDescription })
    const errorUrl = new URL('/auth/sign-in', request.url)
    errorUrl.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(errorUrl)
  }

  if (!code && !(tokenHash && typeRaw)) {
    console.warn('[auth/callback] No code or token_hash+type — cannot verify session')
    return NextResponse.redirect(new URL('/auth/sign-in?error=missing_code', request.url))
  }

  try {
    const supabase = await getSupabaseServer()

    if (code) {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[auth/callback] Error exchanging code for session:', exchangeError)
        const errorUrl = new URL('/auth/sign-in', request.url)
        errorUrl.searchParams.set('error', exchangeError.message || 'Invalid or expired confirmation link')
        return NextResponse.redirect(errorUrl)
      }

      if (!data.session) {
        console.error('[auth/callback] No session created after code exchange')
        const errorUrl = new URL('/auth/sign-in', request.url)
        errorUrl.searchParams.set('error', 'Failed to create session. Please try signing in.')
        return NextResponse.redirect(errorUrl)
      }
    } else {
      const otpType = parseOtpType(typeRaw)
      if (!otpType || !tokenHash) {
        return NextResponse.redirect(new URL('/auth/sign-in?error=invalid_link', request.url))
      }
      const { error: otpError } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      })
      if (otpError) {
        console.error('[auth/callback] verifyOtp failed:', otpError)
        const errorUrl = new URL('/auth/sign-in', request.url)
        errorUrl.searchParams.set('error', otpError.message || 'Invalid or expired confirmation link')
        return NextResponse.redirect(errorUrl)
      }
    }

    const nextUrl = new URL(next, request.url)
    const wantsSignIn = nextUrl.pathname.startsWith('/auth/sign-in')
    if (wantsSignIn) {
      nextUrl.searchParams.set('email_confirmed', '1')
      await supabase.auth.signOut()
    }

    console.log('[auth/callback] Auth callback OK, redirecting to:', nextUrl.toString())
    return NextResponse.redirect(nextUrl)
  } catch (err: any) {
    console.error('[auth/callback] Unexpected error:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    const errorUrl = new URL('/auth/sign-in', request.url)
    errorUrl.searchParams.set('error', 'An unexpected error occurred. Please try again.')
    return NextResponse.redirect(errorUrl)
  }
}

