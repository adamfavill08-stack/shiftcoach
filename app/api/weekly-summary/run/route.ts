import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { getWeeklyMetrics } from '@/lib/data/getWeeklyMetrics'
import { generateWeeklySummary } from '@/lib/coach/generateWeeklySummary'
import { getBehaviorSummary } from '@/lib/data/getBehaviorSummary'
import { generateWeeklyGoals } from '@/lib/coach/generateWeeklyGoals'

/**
 * POST /api/weekly-summary/run
 * 
 * This endpoint should be called by a cron job (Supabase cron, Vercel cron, etc.)
 * 
 * For production, use SUPABASE_SERVICE_ROLE_KEY to create a service-role client
 * instead of relying on auth cookies.
 */
export async function POST(req: NextRequest) {
  try {
    // TODO: In production, use service-role Supabase client with SUPABASE_SERVICE_ROLE_KEY
    // For now, using route handler client (will work if called with proper auth)
    const { supabase } = await getServerSupabaseAndUserId()

    // Optional: Check for a secret header to protect this endpoint
    const secret = req.headers.get('x-weekly-summary-secret')
    const expectedSecret = process.env.WEEKLY_SUMMARY_SECRET
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 1) Get all user IDs
    const { data: profiles, error: userErr } = await supabase
      .from('profiles')
      .select('user_id')

    if (userErr) {
      console.error('[weekly-summary] Failed to fetch users:', userErr)
      return NextResponse.json(
        { error: 'Failed to fetch users', details: userErr.message },
        { status: 500 }
      )
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ ok: true, message: 'No users found' })
    }

    console.log(`[weekly-summary] Processing ${profiles.length} users`)

    let successCount = 0
    let errorCount = 0

    for (const profile of profiles) {
      const userId = profile.user_id as string

      try {
        // 2) Get weekly metrics (current week)
        const metrics = await getWeeklyMetrics(supabase, userId)
        
        // Build metrics history for behavior analysis
        const history = [metrics]
        // TODO: Optionally fetch previous week metrics for trend comparison
        // For now, we'll use just current week - behavior summary will handle single week
        
        // 3) Generate behavior summary
        const behaviorSummary = getBehaviorSummary(history)
        
        // 4) Fetch recent goal feedback to influence goal generation
        const { data: recentFeedback } = await supabase
          .from('weekly_goal_feedback')
          .select('sentiment, week_start, reflection')
          .eq('user_id', userId)
          .order('week_start', { ascending: false })
          .limit(3)

        // Build feedback summary
        const feedbackSummaryLines: string[] = []
        if (recentFeedback && recentFeedback.length > 0) {
          feedbackSummaryLines.push('Recent weekly goal outcomes:')
          for (const f of recentFeedback) {
            feedbackSummaryLines.push(
              `- Week ${f.week_start}: ${(f.sentiment as string).toUpperCase()}`
            )
          }
        }
        const feedbackSummary = feedbackSummaryLines.length > 0
          ? feedbackSummaryLines.join('\n')
          : undefined
        
        // 5) Generate weekly summary
        const summaryText = await generateWeeklySummary(metrics)
        
        if (!summaryText) {
          console.warn(`[weekly-summary] Empty summary for user ${userId}`)
          errorCount++
          continue
        }

        // 6) Generate weekly goals (with feedback context)
        const { goalsText, focusAreas } = await generateWeeklyGoals(
          metrics,
          behaviorSummary,
          feedbackSummary
        )

        // 7) Upsert into weekly_summaries
        const { error: upsertError } = await supabase
          .from('weekly_summaries')
          .upsert(
            {
              user_id: userId,
              week_start: metrics.weekStart,
              summary_text: summaryText,
              sleep_hours_avg: metrics.avgSleepHours,
              body_clock_avg: metrics.avgBodyClock,
              recovery_avg: metrics.avgRecovery,
              steps_avg: metrics.avgSteps,
              calories_avg: metrics.avgCalories,
            },
            { onConflict: 'user_id,week_start' }
          )

        if (upsertError) {
          console.error(`[weekly-summary] Failed to upsert summary for user ${userId}:`, upsertError)
          errorCount++
          continue
        }

        // 8) Upsert into weekly_goals
        if (goalsText) {
          const { error: goalsUpsertError } = await supabase
            .from('weekly_goals')
            .upsert(
              {
                user_id: userId,
                week_start: metrics.weekStart,
                goals: goalsText,
                focus_area_sleep: focusAreas.sleep,
                focus_area_steps: focusAreas.steps,
                focus_area_nutrition: focusAreas.nutrition,
                focus_area_mood: focusAreas.mood,
                focus_area_recovery: focusAreas.recovery,
              },
              { onConflict: 'user_id,week_start' }
            )

          if (goalsUpsertError) {
            console.error(`[weekly-summary] Failed to upsert goals for user ${userId}:`, goalsUpsertError)
            // Continue anyway - goals are optional
          }
        }

        // 9) Also store as coach messages in ai_messages (if they have a conversation)
        const { data: convos } = await supabase
          .from('ai_conversations')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)

        const convo = convos?.[0]
        if (convo) {
          // Insert summary message
          await supabase.from('ai_messages').insert({
            user_id: userId,
            conversation_id: convo.id,
            role: 'assistant',
            content:
              "Here's your weekly Shift Coach summary:\n\n" + summaryText,
          })

          // Insert goals message
          if (goalsText) {
            await supabase.from('ai_messages').insert({
              user_id: userId,
              conversation_id: convo.id,
              role: 'assistant',
              content:
                "Here are your suggested focus points for this week:\n\n" + goalsText,
            })
          }
        }

        successCount++
        console.log(`[weekly-summary] ✓ Generated summary and goals for user ${userId}`)
      } catch (err) {
        console.error(
          `[weekly-summary] Failed for user ${userId}:`,
          err instanceof Error ? err.message : String(err)
        )
        errorCount++
      }
    }

    return NextResponse.json({
      ok: true,
      successCount,
      errorCount,
      totalUsers: profiles.length,
    })
  } catch (err: any) {
    console.error('[weekly-summary] Fatal error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal error', stack: err?.stack },
      { status: 500 }
    )
  }
}

