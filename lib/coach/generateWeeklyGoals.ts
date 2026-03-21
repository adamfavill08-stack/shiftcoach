import { openai } from '@/lib/openaiClient'
import { SHIFT_CALI_COACH_SYSTEM_PROMPT } from '@/lib/coach/systemPrompt'
import type { WeeklyMetrics } from '@/lib/data/getWeeklyMetrics'
import type { BehaviorSummary } from '@/lib/data/getBehaviorSummary'

export type WeeklyGoalsResult = {
  goalsText: string
  focusAreas: {
    sleep: boolean
    steps: boolean
    nutrition: boolean
    mood: boolean
    recovery: boolean
  }
}

/**
 * Generate weekly goals text using OpenAI
 */
export async function generateWeeklyGoals(
  current: WeeklyMetrics,
  behaviorSummary: BehaviorSummary,
  feedbackSummary?: string
): Promise<WeeklyGoalsResult> {
  const contextParts = [
    `Week window: ${current.weekStart} → ${current.weekEnd}`,
    '',
    'Behavior summary:',
    behaviorSummary.text,
  ]

  if (feedbackSummary) {
    contextParts.push('', feedbackSummary)
  }

  const context = contextParts.join('\n').trim()

  const systemPrompt = `
${SHIFT_CALI_COACH_SYSTEM_PROMPT}

You are now designing a TINY WEEKLY PLAN for the user.

Rules:
- Suggest 2–3 very small, realistic goals for the upcoming week.
- Focus on what will actually help a shift worker: sleep timing, light exposure, meal timing, steps, wind-down habits, caffeine timing.
- Assume they are often tired and overworked. Be kind.
- Keep the goals specific but forgiving. Example:
  - "On 3 nights this week, try to be in bed within 30 minutes of your planned time."
  - "On at least 2 shifts, walk for 10–15 minutes before or after work."
- Use bullet points.
- Avoid anything that sounds like punishment or guilt.
- Prefer 'If you can...' over 'You must...'.
`.trim()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Fixed typo: was gpt-4.1-mini
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          'Using the behavior summary below, create 2–3 specific, tiny weekly goals for the user:\n\n' +
          context,
      },
    ],
  })

  const goalsText = completion.choices[0]?.message?.content?.trim() ?? ''

  // Simple tag inference: we can refine later or have LLM return JSON
  const textLower = goalsText.toLowerCase()
  const focusAreas = {
    sleep: /sleep|bed|wake|nap/.test(textLower),
    steps: /walk|steps|movement|move/.test(textLower),
    nutrition: /meal|calorie|protein|food|snack/.test(textLower),
    mood: /mood|stress|relax|unwind|wind-down|anxious/.test(textLower),
    recovery: /recovery|rest|restore|fatigue|tired/.test(textLower),
  }

  return { goalsText, focusAreas }
}

