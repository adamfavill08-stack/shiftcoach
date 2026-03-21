import type { Profile } from '@/lib/profile'
import type { SleepInsight } from '@/lib/sleep-insight'

export type CoachContext = {
  profile: Profile
  rhythm_score: number
  recovery_score: number
  binge_risk: 'Low'|'Medium'|'High'
  caffeine_cutoff: string
  water_ml: number
  water_goal_ml: number
  caffeine_mg: number
  sleep_goal_h: number
}

export function getCoachTip(ctx: CoachContext): { title: string; body: string } {
  const tips: { score: number; title: string; body: string }[] = []
  const cutoffStr = new Date(ctx.caffeine_cutoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const waterPct = ctx.water_ml / (ctx.water_goal_ml || 2500)

  // Late caffeine
  const now = new Date()
  if (now > new Date(ctx.caffeine_cutoff) && ctx.caffeine_mg > 0) {
    tips.push({
      score: 95,
      title: 'Caffeine cut-off missed',
      body: `Try to avoid caffeine after ${cutoffStr}. Skipping one late coffee can lift your Shift Rhythm by 10–20 points tomorrow.`
    })
  }

  // Hydration
  if (waterPct < 0.5) {
    tips.push({
      score: 80,
      title: 'Hydration lagging',
      body: `You've hit ${(ctx.water_ml/1000).toFixed(1)}L so far. Aim for small sips every hour to reach ${(ctx.water_goal_ml/1000).toFixed(1)}L.`
    })
  }

  // Recovery low
  if (ctx.recovery_score < 60) {
    tips.push({
      score: 85,
      title: 'Prioritise recovery',
      body: `Recovery is ${ctx.recovery_score}. A 20–30 min wind-down (dim lights, no phone) before bed improves sleep depth and tomorrow's energy.`
    })
  }

  // Rhythm low at night shifts
  if (ctx.rhythm_score < 60) {
    tips.push({
      score: 88,
      title: 'Shift Rhythm boost',
      body: `Anchor your main sleep window and avoid bright light 2h before sleep. Blue-light glasses on shift can also help.`
    })
  }

  // Binge risk
  if (ctx.binge_risk !== 'Low') {
    tips.push({
      score: 75,
      title: 'Stop the binge trigger',
      body: `Carry a high-protein snack (20–30g) for your hungriest window. It blunts cravings without blowing calories.`
    })
  }

  // Default nudge
  if (!tips.length) {
    tips.push({
      score: 50,
      title: 'Nice work',
      body: `Keep doing what you're doing. Small daily wins compound into big changes across shifts.`
    })
  }

  // Pick the strongest
  tips.sort((a,b) => b.score - a.score)
  const top = tips[0]
  return { title: top.title, body: top.body }
}

// --- New V2 that blends with Sleep Insight

type Tip = { score: number; title: string; body: string }

function baseCoachTips(ctx: CoachContext): Tip[] {
  const tips: Tip[] = []
  const cutoffStr = new Date(ctx.caffeine_cutoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const waterPct = ctx.water_goal_ml ? ctx.water_ml / ctx.water_goal_ml : 0

  if (Date.now() > new Date(ctx.caffeine_cutoff).getTime() && ctx.caffeine_mg > 0) {
    tips.push({ score: 95, title: 'Caffeine cut-off missed', body: `Try to avoid caffeine after ${cutoffStr}. Skipping one late coffee can lift your Shift Rhythm by 10–20 points tomorrow.` })
  }
  if (waterPct < 0.5) {
    tips.push({ score: 80, title: 'Hydration lagging', body: `You’ve hit ${(ctx.water_ml/1000).toFixed(1)}L so far. Aim small sips hourly to reach ${(ctx.water_goal_ml/1000).toFixed(1)}L.` })
  }
  if (ctx.recovery_score < 60) {
    tips.push({ score: 85, title: 'Prioritise recovery', body: `Recovery is ${ctx.recovery_score}. A 20–30 min wind-down (dim lights, no phone) will deepen sleep and lift tomorrow’s energy.` })
  }
  if (ctx.rhythm_score < 60) {
    tips.push({ score: 88, title: 'Shift Rhythm boost', body: 'Anchor your main sleep window and avoid bright light 2h before bed. Blue-light filters on shift can help.' })
  }
  if (ctx.binge_risk !== 'Low') {
    tips.push({ score: 75, title: 'Stop the binge trigger', body: 'Carry a 20–30g protein snack for your hungriest window. It blunts cravings without blowing calories.' })
  }
  if (!tips.length) {
    tips.push({ score: 50, title: 'Nice work', body: 'Keep stacking small wins. Consistency across shifts drives compounding results.' })
  }
  return tips
}

export function getCoachTipV2(ctx: CoachContext, sleepInsight?: SleepInsight | null) {
  const tips = baseCoachTips(ctx)
  if (sleepInsight?.scoreHints?.length) {
    tips.push({ score: 99, title: 'Shift Rhythm tip', body: sleepInsight.scoreHints[0] })
  }
  tips.sort((a,b) => b.score - a.score)
  const top = tips[0]
  return { title: top.title, body: top.body }
}

