import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

import { SHIFT_CALI_COACH_SYSTEM_PROMPT } from '@/lib/coach/systemPrompt'
import { getCoachingState } from '@/lib/coach/getCoachingState'
import { openai } from '@/lib/openaiClient'

function isRateLimitError(err: any) {
  if (!err) return false
  if (err.status === 429) return true
  const message = typeof err.message === 'string' ? err.message : ''
  if (message.includes('Rate limit')) return true
  const code = err?.error?.code || err?.code
  return code === 'rate_limit_exceeded'
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()

    const { getUserMetrics } = await import('@/lib/data/getUserMetrics')
    const metrics = await getUserMetrics(userId, supabase)

    const shiftTypeNormalized = metrics.shiftType
      ? (metrics.shiftType.toLowerCase() as 'day' | 'night' | 'late' | 'off')
      : null

    const coachingState = getCoachingState({
      bodyClockScore: metrics.bodyClockScore,
      recoveryScore: metrics.recoveryScore,
      sleepHoursLast24h: metrics.sleepHoursLast24,
      shiftType: shiftTypeNormalized,
      moodScore: metrics.moodScore,
      focusScore: metrics.focusScore,
    })

    const contextParts: string[] = []
    if (metrics.bodyClockScore !== null) {
      contextParts.push(`Body Clock Score: ${metrics.bodyClockScore}`)
    }
    if (metrics.sleepHoursLast24 !== null) {
      contextParts.push(`Sleep (last 24h): ${metrics.sleepHoursLast24} h`)
    }
    if (metrics.recoveryScore !== null) {
      contextParts.push(`Recovery Score: ${metrics.recoveryScore}`)
    }
    if (metrics.shiftType) {
      contextParts.push(`Shift type: ${metrics.shiftType}`)
    }
    if (metrics.adjustedCalories !== null) {
      contextParts.push(`Calories: ${metrics.adjustedCalories} kcal`)
    }
    if (metrics.steps !== null) {
      contextParts.push(`Steps: ${metrics.steps.toLocaleString()}`)
    }

    const contextSummary = contextParts.length
      ? `User context:\n- ${contextParts.join('\n- ')}`
      : 'User context: No recent data logged yet.'

    const systemMessage = `
${SHIFT_CALI_COACH_SYSTEM_PROMPT}

Coaching state summary:
${coachingState.summary}

${contextSummary}

You are generating one short, highly practical coaching tip to show under the user’s Shift Rhythm gauge in the app.

Rules:

1–2 sentences, max ~35 words.

No greetings, no emojis, no questions.

Speak directly to the user (“Keep your main sleep anchored…”, “Tonight, aim for…”).

Tailor the tip to their body clock score, shift type, sleep, and recovery state.

Prioritise safety, realistic energy management, cravings control, and sleep protection for shift workers.`.trim()

    const messages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: systemMessage,
      },
      {
        role: 'user',
        content: 'Give me one tip for this user now.',
      },
    ]

    let chatRes
    try {
      chatRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.6,
        messages,
      })
    } catch (err) {
      console.error('[/api/coach/tip] OpenAI error:', err)
      if (isRateLimitError(err)) {
        const fallbackTip =
          coachingState.status === 'red'
            ? 'Protect your main sleep window today and keep caffeine front-loaded to help your body clock reset.'
            : 'Anchor your main sleep window and keep meals consistent with your shift to keep your rhythm steady.'
        return NextResponse.json(
          { tip: fallbackTip, coachingState, metrics, rateLimited: true },
          { status: 200 },
        )
      }
      throw err
    }

    const tip = chatRes.choices[0]?.message?.content?.trim() || 'No tip available right now.'

    return NextResponse.json({ tip, coachingState, metrics }, { status: 200 })
  } catch (err) {
    console.error('[/api/coach/tip] error:', err)
    return NextResponse.json({ error: 'Failed to generate tip' }, { status: 500 })
  }
}
