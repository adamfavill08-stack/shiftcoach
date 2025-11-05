import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getCoachingState } from '@/lib/coach/getCoachingState'
import { getUserMetrics } from '@/lib/data/getUserMetrics'

/**
 * POST /api/coach/check-red
 * 
 * Checks if user is in RED state and sends proactive message if needed
 * This should be called periodically (e.g., daily cron or when metrics update)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // Fetch user metrics
    const metrics = await getUserMetrics(user.id, supabase)

    // Compute coaching state (normalize shift type to lowercase)
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

    // If RED state, check if we already sent a message today
    if (coachingState.status === 'red') {
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

      // Check if we already sent a proactive message today
      const { data: existingMessages } = await supabase
        .from('ai_messages')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'assistant')
        .gte('created_at', `${today}T00:00:00Z`)
        .like('content', '%I\'ve noticed your sleep and recovery%')
        .limit(1)

      if (!existingMessages || existingMessages.length === 0) {
        // Get or create active conversation
        const { data: existingConvos } = await supabase
          .from('ai_conversations')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)

        let conversationId = existingConvos?.[0]?.id

        if (!conversationId) {
          const { data: newConvo } = await supabase
            .from('ai_conversations')
            .insert({
              user_id: user.id,
              title: 'ShiftCali coaching',
              is_active: true,
            })
            .select('id')
            .single()

          conversationId = newConvo?.id
        }

        if (conversationId) {
          // Send proactive message
          await supabase.from('ai_messages').insert({
            user_id: user.id,
            conversation_id: conversationId,
            role: 'assistant',
            content:
              "I've noticed your sleep and recovery have been low. Want to talk through a lighter plan for today?",
          })

          return NextResponse.json({
            sent: true,
            state: coachingState.status,
            label: coachingState.label,
          })
        }
      }
    }

    return NextResponse.json({
      sent: false,
      state: coachingState.status,
      label: coachingState.label,
    })
  } catch (err: any) {
    console.error('[api/coach/check-red] Error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal error' },
      { status: 500 }
    )
  }
}

