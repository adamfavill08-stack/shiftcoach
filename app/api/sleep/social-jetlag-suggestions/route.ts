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
      currentMisalignmentHours,
      weeklyAverageMisalignmentHours,
      category,
      baselineMidpointClock,
      currentMidpointClock,
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

    // Build context about social jetlag
    const jetlagContext: string[] = []
    
    if (currentMisalignmentHours !== undefined && currentMisalignmentHours !== null) {
      jetlagContext.push(`Current misalignment: ${currentMisalignmentHours.toFixed(1)} hours`)
    }
    
    if (weeklyAverageMisalignmentHours !== undefined && weeklyAverageMisalignmentHours !== null) {
      jetlagContext.push(`Weekly average misalignment: ${weeklyAverageMisalignmentHours.toFixed(1)} hours`)
    }
    
    if (category) {
      jetlagContext.push(`Category: ${category} (${category === 'low' ? '0-1.5h' : category === 'moderate' ? '1.5-3.5h' : '>3.5h'})`)
    }

    if (baselineMidpointClock !== undefined && currentMidpointClock !== undefined) {
      const formatTime = (hours: number) => {
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
      jetlagContext.push(`Baseline midpoint: ${formatTime(baselineMidpointClock)}, Current midpoint: ${formatTime(currentMidpointClock)}`)
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

    const jetlagSummary = jetlagContext.length
      ? `Social Jetlag Metrics:\n- ${jetlagContext.join('\n- ')}`
      : 'Social Jetlag Metrics: Not available'

    const systemMessage = `
${SHIFT_CALI_COACH_SYSTEM_PROMPT}

Coaching state summary:
${coachingState.summary}

${contextSummary}

${jetlagSummary}

You are providing personalized suggestions to help a shift worker reduce their social jetlag. Social jetlag is the difference between their current sleep midpoint and their baseline (usual) sleep midpoint.

Provide 2-3 specific, actionable suggestions tailored to their current misalignment level and shift work context. Focus on:
- Practical adjustments they can make to reduce the misalignment
- Shift-specific advice (accounting for night shifts, rotating schedules, etc.)
- Strategies to help their body clock adapt more smoothly when shifts change
- Realistic expectations for shift workers (some variation is normal)
- Small, achievable steps rather than major overhauls

Format your response as a short paragraph (2-3 sentences) followed by 2-3 bullet points with specific actions.

Be encouraging, non-judgmental, and acknowledge the challenges of shift work. If their jetlag is low, acknowledge this and suggest ways to maintain it. If it's moderate or high, provide gentle, practical steps to help reduce it.`.trim()

    const messages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: systemMessage,
      },
      {
        role: 'user',
        content: 'Give me personalized suggestions to reduce my social jetlag based on my current data.',
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
      console.error('[/api/sleep/social-jetlag-suggestions] OpenAI error:', err)
      if (isRateLimitError(err)) {
        const fallbackSuggestions = generateFallbackSuggestions(
          currentMisalignmentHours,
          category,
          weeklyAverageMisalignmentHours
        )
        return NextResponse.json(
          { suggestions: fallbackSuggestions, rateLimited: true },
          { status: 200 }
        )
      }
      throw err
    }

    const suggestions = chatRes.choices[0]?.message?.content?.trim() || generateFallbackSuggestions(
      currentMisalignmentHours,
      category,
      weeklyAverageMisalignmentHours
    )

    return NextResponse.json({ suggestions }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/sleep/social-jetlag-suggestions] error:', err)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: err?.message },
      { status: 500 }
    )
  }
}

function generateFallbackSuggestions(
  currentMisalignmentHours: number | undefined,
  category: string | undefined,
  weeklyAverageMisalignmentHours: number | undefined
): string {
  const suggestions: string[] = []
  
  if (category === 'high' || (currentMisalignmentHours !== undefined && currentMisalignmentHours > 3.5)) {
    suggestions.push('• Try to gradually shift your sleep window by 30-60 minutes per day when transitioning between shifts, rather than making sudden large changes.')
    suggestions.push('• Use light exposure strategically: bright light in the morning after night shifts, and dim light before bed to help reset your body clock.')
    suggestions.push('• Consider maintaining a consistent sleep midpoint on your days off that&apos;s closer to your baseline, rather than letting it drift too far.')
  } else if (category === 'moderate' || (currentMisalignmentHours !== undefined && currentMisalignmentHours > 1.5)) {
    suggestions.push('• Aim to anchor your main sleep window within a 2-hour range, even when shifts change.')
    suggestions.push('• Use blackout curtains and eye masks to protect your sleep environment during day sleep after night shifts.')
    suggestions.push('• Gradually adjust your bedtime by 15-30 minutes per day when preparing for a shift change.')
  } else {
    suggestions.push('• Keep maintaining your consistent sleep schedule. Your body clock is well-aligned with your usual rhythm.')
    suggestions.push('• Continue logging your sleep to track any changes, especially when shift patterns change.')
  }
  
  if (suggestions.length === 0) {
    suggestions.push('• Maintain consistency in your sleep timing, especially on days off.')
    suggestions.push('• Use light exposure and meal timing to help your body clock adapt when shifts change.')
  }
  
  return `Based on your current social jetlag (${currentMisalignmentHours?.toFixed(1) || 'unknown'} hours), here are some practical steps you can take:\n\n${suggestions.join('\n')}`
}

