import type { MealSlot } from '@/lib/nutrition/getTodayMealSchedule'
import { isBiologicalNightLocal } from '@/lib/nutrition/applyBiologicalNightMealPolicy'

/**
 * Long late shifts often end at or past midnight — post-shift fuel should read as a small
 * wind-down bite, not a full meal in the biological night / very late evening.
 * Returns true when the post-shift slot was adjusted.
 */
export function applyLongLatePostShiftSoftPolicy(
  slots: MealSlot[],
  adjustedCalories: number,
): boolean {
  const post = slots.find((s) => s.id === 'dinner')
  if (!post) return false

  const total = Math.max(1200, Math.round(adjustedCalories || 0))
  const h = post.time.getHours()
  const veryLate = h >= 23 || h < 6
  const inBio = isBiologicalNightLocal(post.time)
  if (!veryLate && !inBio) return false

  const maxShare = 0.13
  const cap = Math.round(total * maxShare)
  if (post.caloriesTarget > cap) {
    const freed = post.caloriesTarget - cap
    post.caloriesTarget = cap
    post.kcalCapped = true
    const main = slots.find((s) => s.id === 'midShift')
    if (main) main.caloriesTarget += freed
  }

  post.label = 'Light post-shift bite before sleep'
  post.hint =
    'Keep this small after a late finish — not a full heavy meal right before wind‑down.'
  post.subtitle = 'Small fuel only — easier sleep after a long late block.'
  return true
}
