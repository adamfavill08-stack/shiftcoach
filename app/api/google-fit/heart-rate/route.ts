import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      error: 'google_fit_deprecated',
      message: 'Google Fit API endpoints are deprecated. Use /api/wearables/heart-rate with Health Connect or Apple Health ingestion.',
    },
    { status: 410 }
  )
}

