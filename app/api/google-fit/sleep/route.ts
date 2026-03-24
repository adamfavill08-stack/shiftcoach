import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      error: 'google_fit_deprecated',
      message: 'Google Fit API endpoints are deprecated. Use Health Connect (Android) or Apple Health (iOS).',
    },
    { status: 410 }
  )
}

