import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdaptedStepGoalAgentResult } from '@/lib/activity/computeAdaptedStepGoalAgent'

/**
 * Writes last agent result to `profiles` (requires migration `20260405120000_adapted_daily_steps_goal.sql`).
 */
export async function persistAdaptedStepGoalAgent(
  supabase: SupabaseClient,
  result: AdaptedStepGoalAgentResult,
): Promise<{ error: Error | null }> {
  const meta = {
    reasons: result.activityPersonalization.reasons,
    factors: result.activityPersonalization.factors,
    explanation: result.activityPersonalization.explanation,
    computedAt: result.activityPersonalization.computedAt,
  }
  const { error } = await supabase
    .from('profiles')
    .update({
      adapted_daily_steps_goal: result.adaptedStepGoal,
      adapted_daily_steps_goal_at: result.activityPersonalization.computedAt,
      activity_adaptation_agent_meta: meta,
    })
    .eq('user_id', result.userId)

  return { error: error ? new Error(error.message) : null }
}
