import { NextRequest, NextResponse } from 'next/server'

// Scopes for Google Fit - activity (steps) + sleep + heart rate read access
const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
].join(' ')

/**
 * GET /api/google-fit/auth
 *
 * Redirects the user to Google's OAuth 2.0 consent screen to connect Google Fit.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID
  const redirectUriProd = process.env.GOOGLE_FIT_REDIRECT_URI
  const redirectUriLocal = process.env.GOOGLE_FIT_REDIRECT_URI_LOCAL

  if (!clientId || !redirectUriProd) {
    console.error('[google-fit/auth] Missing Google Fit env vars')
    return NextResponse.json(
      { error: 'Google Fit is not configured on the server.' },
      { status: 500 }
    )
  }

  const url = new URL(req.url)
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'

  const redirectUri =
    isLocalhost && redirectUriLocal ? redirectUriLocal : redirectUriProd

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline', // get refresh token
    include_granted_scopes: 'true',
    scope: GOOGLE_FIT_SCOPES,
    prompt: 'consent', // always show consent to ensure refresh token
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return NextResponse.redirect(authUrl)
}


