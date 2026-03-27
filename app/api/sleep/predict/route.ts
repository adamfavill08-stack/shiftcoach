/**
 * POST /api/sleep/predict
 * Server-side sleep prediction endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { predictSleep, type SleepType } from '@/lib/sleep/predictSleep'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

const SleepPredictSchema = z.object({
  type: z.enum(['main', 'post_shift', 'pre_shift_nap', 'recovery', 'nap']),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, SleepPredictSchema)
    if (!parsed.ok) return parsed.response
    const { type } = parsed.data
    
    const prediction = await predictSleep(type)
    
    if (!prediction) {
      // Return a safe fallback instead of 404 so quick-log UI
      // remains usable even when prediction inputs are sparse.
      const now = new Date()
      const end = new Date(now)
      const start = new Date(now)
      start.setHours(now.getHours() - (type === 'nap' || type === 'pre_shift_nap' ? 1 : 7), 0, 0, 0)
      return NextResponse.json({
        suggestedStart: start.toISOString(),
        suggestedEnd: end.toISOString(),
        type,
        confidence: 0.3,
        reasoning: 'Using fallback window while we gather more sleep and shift data.',
      }, { status: 200 })
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
    return apiServerError('unexpected_error', err?.message || 'Internal server error')
  }
}

