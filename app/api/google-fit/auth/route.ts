import { NextResponse } from 'next/server'

/**
 * Google Fit onboarding has been sunset.
 * Android should use Health Connect and iOS should use Apple Health.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'google_fit_deprecated',
      message: 'Google Fit onboarding is disabled. Use Health Connect on Android or Apple Health on iOS.',
    },
    { status: 410 }
  )
}

