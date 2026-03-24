import { NextResponse } from 'next/server'

// Lightweight health‑check endpoint for OpenAI configuration.
// In production we avoid calling the OpenAI SDK during build so that
// deployments never fail because of missing/invalid keys.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const hasKey = !!process.env.OPENAI_API_KEY

  return NextResponse.json(
    hasKey
      ? {
          success: true,
          message: 'OPENAI_API_KEY is set in this environment.',
        }
      : {
          success: false,
          error: 'OPENAI_API_KEY is not set in this environment.',
        },
    { status: hasKey ? 200 : 500 },
  )
}

