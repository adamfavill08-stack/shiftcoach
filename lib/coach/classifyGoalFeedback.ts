export type GoalFeedbackSentiment = 'completed' | 'partial' | 'struggled' | 'none'

/**
 * Classify goal feedback sentiment from user message
 * Simple rule-based classifier (can be upgraded to LLM later)
 */
export function classifyGoalFeedback(message: string): GoalFeedbackSentiment {
  const text = message.toLowerCase()

  // Very simple rule-based classifier for now
  if (
    /hit all my goals|completed my goals|smashed my goals|did everything|achieved|all my goals|finished all|nailed my goals/i.test(
      text
    )
  ) {
    return 'completed'
  }

  if (
    /some of my goals|a few of them|didn't do all|managed a couple|part of my goals|half of my goals|some goals|did some/i.test(
      text
    )
  ) {
    return 'partial'
  }

  if (
    /missed my goals|failed my goals|did none|couldn't do it|struggled with my goals|didn't manage any|didn't hit|couldn't complete|barely did|didn't achieve/i.test(
      text
    )
  ) {
    return 'struggled'
  }

  return 'none'
}

