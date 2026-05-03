import type { MealScheduleMeta, MealScheduleReason } from '@/lib/nutrition/mealScheduleProvenance'
import type { MealSlotId } from '@/lib/nutrition/getTodayMealSchedule'

/** API meal row + optional planner fields used for display copy. */
export type MealSlotDisplayInput = {
  id: string
  label: string
  hint?: string
  subtitle?: string
  role?: string
  biologicalNight?: boolean
  kcalCapped?: boolean
}

export type MealSlotDisplayCopy = {
  title: string
  subtitle: string
  explanation: string
  badge?: string
}

const KNOWN_IDS = new Set<string>([
  'breakfast',
  'preShift',
  'midShift',
  'nightSnack',
  'postShiftBreakfast',
  'lunch',
  'dinner',
  'daySnack',
])

function titleFromLabelFallback(label: string): string {
  return label.trim() || 'Meal'
}

/**
 * One-line schedule context for list headers / coach panels (not per-slot).
 * Priority respects transition vs calendar-off pre-night distinction.
 */
export function getScheduleContextSubtitle(meta: MealScheduleMeta | null | undefined): string | undefined {
  if (!meta) return undefined
  const reasons = meta.scheduleReason ?? []
  const has = (r: MealScheduleReason) => reasons.includes(r)
  const gm = meta.guidanceMode

  if (gm === 'transition_day_to_night' || has('transition_day_to_night')) {
    return 'Preparing your meals around your first night shift tonight.'
  }
  if (meta.offDayContext === 'before_first_night' || has('off_before_first_night')) {
    return 'Off today, but your meals are timed to prepare for tonight’s night shift.'
  }
  if (meta.offDayContext === 'between_nights' || has('off_between_nights')) {
    return 'Recovery day between night shifts — meals are anchored around your next night.'
  }
  if (meta.offDayContext === 'after_final_night' || has('off_after_final_night')) {
    return 'Recovering after your final night — lighter meals while your rhythm settles.'
  }
  if (meta.longShift || has('long_day')) {
    return 'Long day shift — extra on-shift fuel is included.'
  }
  if (meta.longShiftLate || has('long_late')) {
    return 'Long late shift — heavier food is kept earlier, with a lighter bite after finish.'
  }
  if (has('biological_night_policy')) {
    return 'Overnight food is kept lighter to support your body clock.'
  }
  if (has('off_normal') || meta.offDayContext === 'normal_off') {
    return 'Off-day meal rhythm.'
  }
  return undefined
}

/**
 * Function-first display strings for meal timing UI. Does not change planner output.
 */
export function getMealSlotDisplayCopy(
  slot: MealSlotDisplayInput,
  meta: MealScheduleMeta | null | undefined,
): MealSlotDisplayCopy {
  const id = slot.id as MealSlotId | string
  const hint = (slot.hint ?? '').trim()
  const sub = (slot.subtitle ?? '').trim()
  const label = (slot.label ?? '').trim()
  const reasons = meta?.scheduleReason ?? []
  const has = (r: MealScheduleReason) => reasons.includes(r)
  const longDay = Boolean(meta?.longShift || has('long_day'))
  const longLate = Boolean(meta?.longShiftLate || has('long_late'))

  let title = label
  let badge: string | undefined
  let subtitle = sub || hint.slice(0, 120) || ''

  const isPostLight =
    id === 'dinner' &&
    (/light post-shift bite before sleep/i.test(label) || /post-shift bite/i.test(label))
  const isNightSnack = id === 'nightSnack'
  const bio = Boolean(slot.biologicalNight)
  const capped = Boolean(slot.kcalCapped)

  if (isPostLight) {
    title = 'Light post-shift bite before sleep'
    subtitle = sub || 'Small fuel after a late finish — easier sleep after a long late block.'
    return {
      title,
      subtitle,
      explanation: hint || subtitle,
      badge: longLate ? 'Long late' : undefined,
    }
  }

  if (isNightSnack && bio && capped) {
    title = 'Light overnight fuel'
    badge = 'Body-clock aware'
    subtitle = sub || 'Kept smaller for body-clock support — lighter fuel, not a large portion.'
    return { title, subtitle, explanation: hint || subtitle, badge }
  }

  if (isNightSnack && bio) {
    title = 'Small overnight snack'
    subtitle = sub || 'Light fuel, not a full meal.'
    return { title, subtitle, explanation: hint || subtitle, badge: 'Overnight' }
  }

  if (isNightSnack && /late.shift light snack/i.test(label)) {
    title = 'Late-shift light snack'
    return { title, subtitle: sub || hint, explanation: hint || sub }
  }

  if (id === 'midShift' && /early.shift fuel/i.test(label)) {
    title = 'Early shift fuel'
    return { title, subtitle: sub || hint, explanation: hint || sub, badge: bio ? 'Overnight' : undefined }
  }

  if (id === 'preShift' && /pre-shift main meal/i.test(label)) {
    title = 'Pre-shift main meal'
    subtitle = sub || 'Your main fuel before nights.'
    return { title, subtitle, explanation: hint || subtitle }
  }

  if (id === 'daySnack' && longDay && /light on-shift fuel/i.test(label)) {
    title = 'Light on-shift fuel'
    subtitle = sub || 'Helps avoid a late-shift energy crash.'
    return { title, subtitle, explanation: hint || subtitle, badge: 'Long day' }
  }

  if (id === 'midShift' && /main on-shift meal/i.test(label)) {
    title = 'Main on-shift meal'
    return { title, subtitle: sub || hint, explanation: hint || sub, badge: longDay || longLate ? 'On shift' : undefined }
  }

  if (id === 'preShift' && /first meal after waking/i.test(label)) {
    title = 'First meal after waking'
    return { title, subtitle: sub || hint, explanation: hint || sub }
  }

  if (id === 'lunch' && /early on-shift main/i.test(label)) {
    title = 'Early on-shift main'
    return { title, subtitle: sub || hint, explanation: hint || sub }
  }

  if (id === 'nightSnack' && /light late-shift fuel/i.test(label)) {
    title = 'Light late-shift fuel'
    return { title, subtitle: sub || hint, explanation: hint || sub, badge: longLate ? 'Long late' : undefined }
  }

  if (meta?.offDayContext === 'after_final_night') {
    if (id === 'breakfast' || /light breakfast/i.test(label)) {
      title = 'Light breakfast'
      badge = 'Recovery'
    } else if (id === 'dinner') {
      title = 'Recovery meal'
      badge = 'Recovery'
    } else {
      title = label
    }
    return {
      title,
      subtitle: sub || getScheduleContextSubtitle(meta) || hint,
      explanation: hint || sub,
      badge,
    }
  }

  if (meta?.shiftType === 'off' && meta.offDayContext === 'normal_off' && id === 'dinner' && !longDay) {
    title = 'Off-day main meal'
    subtitle = sub || hint
    return { title, subtitle, explanation: hint || subtitle }
  }

  if (id === 'postShiftBreakfast' && /light post-shift bite/i.test(label)) {
    title = 'Light post-shift bite before sleep'
    return { title, subtitle: sub || hint, explanation: hint || sub }
  }

  if (KNOWN_IDS.has(id)) {
    return {
      title,
      subtitle: sub || hint.slice(0, 140),
      explanation: hint || sub || titleFromLabelFallback(label),
    }
  }

  return {
    title: titleFromLabelFallback(label),
    subtitle: sub || hint.slice(0, 140),
    explanation: hint || sub || title,
  }
}
