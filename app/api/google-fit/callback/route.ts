import { NextRequest, NextResponse } from 'next/server'

/**
 * Legacy callback kept only to provide deterministic deprecation behavior.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const redirectUrl = new URL('/dashboard?googleFitError=google_fit_deprecated', url.origin)
  return NextResponse.redirect(redirectUrl)
}

