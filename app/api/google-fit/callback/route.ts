import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

/**
 * GET /api/google-fit/callback
 *
 * Handles the OAuth 2.0 callback from Google, exchanges the code for tokens,
 * and confirms connection. For now, tokens are not persisted – this is the first
 * step to prove the flow works. We can later store tokens per user in Supabase.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    if (error) {
      console.error('[google-fit/callback] OAuth error:', error)
      const redirectUrl = new URL(
        `/dashboard?googleFitError=${encodeURIComponent(error)}`,
        url.origin
      )
      return NextResponse.redirect(redirectUrl)
    }

    if (!code) {
      console.error('[google-fit/callback] Missing code parameter')
      const redirectUrl = new URL(
        '/dashboard?googleFitError=missing_code',
        url.origin
      )
      return NextResponse.redirect(redirectUrl)
    }

    const clientId = process.env.GOOGLE_FIT_CLIENT_ID
    const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET
    const redirectUriProd = process.env.GOOGLE_FIT_REDIRECT_URI
    const redirectUriLocal = process.env.GOOGLE_FIT_REDIRECT_URI_LOCAL

    if (!clientId || !clientSecret || !redirectUriProd) {
      console.error('[google-fit/callback] Missing Google Fit env vars')
      const redirectUrl = new URL(
        '/dashboard?googleFitError=server_not_configured',
        url.origin
      )
      return NextResponse.redirect(redirectUrl)
    }

    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const redirectUri =
      isLocalhost && redirectUriLocal ? redirectUriLocal : redirectUriProd

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenJson = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('[google-fit/callback] Token exchange failed:', tokenJson)
      const redirectUrl = new URL(
        '/dashboard?googleFitError=token_exchange_failed',
        url.origin
      )
      return NextResponse.redirect(redirectUrl)
    }

    const { access_token, refresh_token, expires_in, scope, token_type } = tokenJson

    if (!access_token) {
      console.error(
        '[google-fit/callback] No access token in response:',
        tokenJson
      )
      const redirectUrl = new URL(
        '/dashboard?googleFitError=no_access_token',
        url.origin
      )
      return NextResponse.redirect(redirectUrl)
    }

    // Get user ID (dev fallback allowed for now)
    const { userId } = await getServerSupabaseAndUserId()

    // Use service-role Supabase client so RLS doesn't block token storage
    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    console.log('[google-fit/callback] Google Fit connected for user:', {
      userId,
      hasRefreshToken: !!refresh_token,
      expiresIn: expires_in,
    })

    // Calculate absolute expiry timestamp (approximate)
    const expiresAt =
      typeof expires_in === 'number'
        ? new Date(Date.now() + expires_in * 1000).toISOString()
        : null

    // Store or update tokens in Supabase
    try {
      const { error: upsertError } = await supabase
        .from('google_fit_tokens')
        .upsert(
          {
            user_id: userId,
            access_token,
            refresh_token: refresh_token ?? null,
            scope: scope ?? null,
            token_type: token_type ?? null,
            expires_at: expiresAt,
          },
          { onConflict: 'user_id' }
        )

      if (upsertError) {
        console.error('[google-fit/callback] Error saving tokens:', upsertError)
      } else {
        console.log('[google-fit/callback] Tokens saved for user:', userId)
      }
    } catch (tokenSaveErr: any) {
      console.error('[google-fit/callback] Exception saving tokens:', {
        name: tokenSaveErr?.name,
        message: tokenSaveErr?.message,
        stack: tokenSaveErr?.stack,
      })
    }

    // For now, just redirect back to dashboard with a success flag
    {
      const redirectUrl = new URL(
        '/dashboard?googleFitConnected=1',
        url.origin
      )
      return NextResponse.redirect(redirectUrl)
    }
  } catch (err: any) {
    console.error('[google-fit/callback] Unexpected error:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    // Use absolute URL for redirects (Next.js requirement)
    const url = new URL(req.url)
    const redirectUrl = new URL(
      '/dashboard?googleFitError=unexpected',
      url.origin
    )
    return NextResponse.redirect(redirectUrl)
  }
}


