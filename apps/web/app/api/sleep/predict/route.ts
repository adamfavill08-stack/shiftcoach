/**
 * POST /api/sleep/predict
 * Server-side sleep prediction endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { predictSleep, type SleepType } from '@/lib/sleep/predictSleep'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type } = body as { type: SleepType }
    
    if (!type) {
      return NextResponse.json(
        { error: 'Missing type parameter' },
        { status: 400 }
      )
    }
    
    const prediction = await predictSleep(type)
    
    if (!prediction) {
      return NextResponse.json(
        { error: 'Could not generate prediction' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      suggestedStart: prediction.suggestedStart.toISOString(),
      suggestedEnd: prediction.suggestedEnd.toISOString(),
      type: prediction.type,
      confidence: prediction.confidence,
      reasoning: prediction.reasoning,
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/sleep/predict] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    )
  }
}

