import { openai } from '@/lib/openaiClient'
import { SHIFT_CALI_COACH_SYSTEM_PROMPT } from '@/lib/coach/systemPrompt'
import type { WeeklyMetrics } from '@/lib/data/getWeeklyMetrics'

/**
 * Generate a weekly summary text using OpenAI
 */
export async function generateWeeklySummary(
  metrics: WeeklyMetrics
): Promise<string> {
  const {
    weekStart,
    weekEnd,
    avgSleepHours,
    avgBodyClock,
    avgRecovery,
    avgSteps,
    avgCalories,
  } = metrics

  const summaryContext = `
Weekly window: ${weekStart} → ${weekEnd}

Averages for this week:
- Sleep: ${avgSleepHours ?? 'no data'} h/night
- Body Clock Score: ${avgBodyClock ?? 'no data'} / 100
- Recovery Score: ${avgRecovery ?? 'no data'} / 100
- Steps: ${avgSteps ? avgSteps.toLocaleString() : 'no data'} per day
- Calories: ${avgCalories ? avgCalories.toLocaleString() : 'no data'} kcal/day
`.trim()

  const systemPrompt = `
${SHIFT_CALI_COACH_SYSTEM_PROMPT}

You are now writing a WEEKLY SUMMARY for the user. Your job:

- Reflect on the week with kindness.
- Highlight 2–3 key positives.
- Gently point out 1–2 risks or issues (e.g. very short sleep, too many low recovery days).
- Suggest 2–3 specific, realistic focus points for the next week.
- Keep it short: 3–5 short paragraphs max, plus bullet points for focus points.
- Assume they are a shift worker with an irregular pattern.
`.trim()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Fixed typo: was gpt-4.1-mini
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          'Using the metrics below, write a warm, human weekly summary for the user.\n\n' +
          summaryContext,
      },
    ],
  })

  return completion.choices[0]?.message?.content?.trim() ?? ''
}

