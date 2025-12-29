import { getSupabaseServer } from '@/lib/supabase-server-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/select-plan'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('[auth/callback] OAuth error:', { error, errorDescription })
    const errorUrl = new URL('/auth/sign-in', request.url)
    errorUrl.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(errorUrl)
  }

  // If no code, redirect to sign-in
  if (!code) {
    console.warn('[auth/callback] No code provided')
    return NextResponse.redirect(new URL('/auth/sign-in?error=missing_code', request.url))
  }

  try {
    const supabase = getSupabaseServer()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[auth/callback] Error exchanging code for session:', exchangeError)
      const errorUrl = new URL('/auth/sign-in', request.url)
      errorUrl.searchParams.set('error', exchangeError.message || 'Invalid or expired confirmation link')
      return NextResponse.redirect(errorUrl)
    }

    // Check if session was created successfully
    if (!data.session) {
      console.error('[auth/callback] No session created after code exchange')
      const errorUrl = new URL('/auth/sign-in', request.url)
      errorUrl.searchParams.set('error', 'Failed to create session. Please try signing in.')
      return NextResponse.redirect(errorUrl)
    }

    console.log('[auth/callback] Email confirmed successfully, redirecting to:', next)
    
    // Redirect to plan selection after successful email confirmation
    return NextResponse.redirect(new URL(next, request.url))
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

