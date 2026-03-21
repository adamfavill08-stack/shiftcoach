import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { SHIFT_CALI_COACH_SYSTEM_PROMPT } from '@/lib/coach/systemPrompt'
import { getCoachingState } from '@/lib/coach/getCoachingState'
import { openai } from '@/lib/openaiClient'

export const dynamic = 'force-dynamic'

function isRateLimitError(err: any) {
  if (!err) return false
  if (err.status === 429) return true
  const message = typeof err.message === 'string' ? err.message : ''
  if (message.includes('Rate limit')) return true
  const code = err?.error?.code || err?.code
  return code === 'rate_limit_exceeded'
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      tonightTarget,
      consistencyScore,
      sleepDeficit,
      weeklyDeficitHours,
      deficitCategory,
    } = body

    // Fetch user metrics for context
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

    // Build context about sleep metrics
    const sleepMetricsContext: string[] = []
    
    if (tonightTarget !== undefined && tonightTarget !== null) {
      sleepMetricsContext.push(`Tonight's Target: ${tonightTarget} hours`)
    }
    
    if (consistencyScore !== undefined && consistencyScore !== null) {
      const consistencyLevel = consistencyScore >= 80 ? 'high' : consistencyScore >= 60 ? 'moderate' : 'low'
      sleepMetricsContext.push(`Sleep Consistency: ${consistencyScore}/100 (${consistencyLevel})`)
    }
    
    if (sleepDeficit !== undefined && sleepDeficit !== null && weeklyDeficitHours !== undefined) {
      const deficitStatus = deficitCategory === 'high' ? 'high deficit' 
        : deficitCategory === 'medium' ? 'moderate deficit'
        : deficitCategory === 'low' ? 'low deficit'
        : deficitCategory === 'surplus' ? 'sleep surplus' : 'unknown'
      sleepMetricsContext.push(`Sleep Deficit: ${Math.abs(weeklyDeficitHours).toFixed(1)} hours (${deficitStatus})`)
    }

    const contextParts: string[] = []
    if (metrics.bodyClockScore !== null) {
      contextParts.push(`Body Clock Score: ${metrics.bodyClockScore}`)
    }
    if (metrics.sleepHoursLast24 !== null) {
      contextParts.push(`Sleep (last 24h): ${metrics.sleepHoursLast24} h`)
    }
    if (metrics.shiftType) {
      contextParts.push(`Shift type: ${metrics.shiftType}`)
    }

    const contextSummary = contextParts.length
      ? `User context:\n- ${contextParts.join('\n- ')}`
      : 'User context: No recent data logged yet.'

    const sleepMetricsSummary = sleepMetricsContext.length
      ? `Current Sleep Metrics:\n- ${sleepMetricsContext.join('\n- ')}`
      : 'Sleep Metrics: Not available'

    const systemMessage = `
${SHIFT_CALI_COACH_SYSTEM_PROMPT}

Coaching state summary:
${coachingState.summary}

${contextSummary}

${sleepMetricsSummary}

You are providing personalized suggestions to help a shift worker improve their sleep metrics. The user is viewing their sleep metrics card which shows:
1. Tonight's Target - recommended sleep duration for tonight based on their sleep deficit and upcoming shift
2. Sleep Consistency - how regular their bedtime is (0-100 score, higher = more consistent)
3. Sleep Deficit - how far behind/ahead they are on their weekly sleep target

Provide 2-3 specific, actionable suggestions tailored to their current metrics and shift work context. Focus on:
- Practical adjustments they can make tonight or this week
- Shift-specific advice (accounting for night shifts, rotating schedules, etc.)
- Realistic expectations for shift workers
- Small, achievable steps rather than major overhauls

Format your response as a short paragraph (3-4 sentences) followed by 2-3 bullet points with specific actions.

Be encouraging, non-judgmental, and acknowledge the challenges of shift work.`.trim()

    const messages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: systemMessage,
      },
      {
        role: 'user',
        content: 'Give me personalized suggestions to improve my sleep metrics based on my current data.',
      },
    ]

    let chatRes
    try {
      chatRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages,
      })
    } catch (err) {
      console.error('[/api/sleep/metrics-suggestions] OpenAI error:', err)
      if (isRateLimitError(err)) {
        // Fallback suggestions based on metrics
        const fallbackSuggestions = generateFallbackSuggestions(
          tonightTarget,
          consistencyScore,
          deficitCategory,
          weeklyDeficitHours
        )
        return NextResponse.json(
          { suggestions: fallbackSuggestions, rateLimited: true },
          { status: 200 }
        )
      }
      throw err
    }

    const suggestions = chatRes.choices[0]?.message?.content?.trim() || generateFallbackSuggestions(
      tonightTarget,
      consistencyScore,
      deficitCategory,
      weeklyDeficitHours
    )

    return NextResponse.json({ suggestions }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/sleep/metrics-suggestions] error:', err)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: err?.message },
      { status: 500 }
    )
  }
}

function generateFallbackSuggestions(
  tonightTarget: number | null | undefined,
  consistencyScore: number | null | undefined,
  deficitCategory: string | null | undefined,
  weeklyDeficitHours: number | null | undefined
): string {
  const suggestions: string[] = []
  
  if (consistencyScore !== null && consistencyScore !== undefined && consistencyScore < 60) {
    suggestions.push('• Try to anchor your main sleep window within a 2-hour range, even when shifts change.')
    suggestions.push('• Use blackout curtains and eye masks to protect your sleep environment during day sleep.')
  }
  
  if (deficitCategory === 'high' || (weeklyDeficitHours !== null && weeklyDeficitHours !== undefined && weeklyDeficitHours > 5)) {
    suggestions.push('• Prioritize recovery sleep on your days off to catch up gradually.')
    suggestions.push('• Consider adding a strategic nap before night shifts to reduce sleep debt.')
  } else if (deficitCategory === 'medium' || (weeklyDeficitHours !== null && weeklyDeficitHours !== undefined && weeklyDeficitHours > 2)) {
    suggestions.push('• Aim for 30-60 minutes extra sleep tonight to start reducing your deficit.')
  }
  
  if (tonightTarget !== null && tonightTarget !== undefined && tonightTarget < 7) {
    suggestions.push('• Tonight, aim for at least 7 hours of main sleep to support recovery.')
  }
  
  if (suggestions.length === 0) {
    suggestions.push('• Keep your main sleep window consistent, even when shift patterns change.')
    suggestions.push('• Protect your sleep environment with darkness, quiet, and a cool temperature.')
  }
  
  return `Based on your current sleep metrics, here are some practical steps you can take:\n\n${suggestions.join('\n')}`
}

