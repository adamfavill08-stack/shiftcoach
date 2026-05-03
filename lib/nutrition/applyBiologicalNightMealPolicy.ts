/**
 * Post-process night-shift meal slots: cap calories during the biological night (~00:00–06:00 local)
 * and use function-first labels so overnight slots do not read like a normal "dinner".
 *
 * Evidence-aligned: lighter intake overnight; main energy before the shift, not at ~02:00.
 */
import type { MealSlot } from '@/lib/nutrition/getTodayMealSchedule'
import type { OffDayContext } from '@/lib/shift-context/types'

/** Inclusive start, exclusive end (local wall clock). */
const BIO_NIGHT_START_MIN = 0
const BIO_NIGHT_END_MIN = 6 * 60

function minutesFromMidnightLocal(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

export function isBiologicalNightLocal(time: Date): boolean {
  const m = minutesFromMidnightLocal(time)
  return m >= BIO_NIGHT_START_MIN && m < BIO_NIGHT_END_MIN
}

const MAX_SHARE_OVERNIGHT_DEFAULT = 0.15
/** Body-night / explicit overnight snack row — strictest cap */
const MAX_SHARE_NIGHT_SNACK_ID = 0.1

/**
 * Mutates slots in place. Preserves times and ordering.
 * Runs for `shiftType === 'night'` and for off-day patterns that include overnight clock fuel.
 */
export function applyBiologicalNightMealPolicy(
  slots: MealSlot[],
  opts: {
    shiftType: 'day' | 'night' | 'late' | 'off'
    adjustedCalories: number
    offDayContext?: OffDayContext | null
  },
): void {
  const useBio =
    opts.shiftType === 'night' ||
    (opts.shiftType === 'off' &&
      (opts.offDayContext === 'before_first_night' || opts.offDayContext === 'between_nights'))
  if (!useBio || slots.length === 0) return

  const total = Math.max(1200, Math.round(opts.adjustedCalories || 0))
  const initialKcal = slots.map((s) => s.caloriesTarget)

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!
    /** Deliberate post-finish fuel before sleep — do not starve by clock-only cap (can sit ~03:00 after a late end). */
    if (slot.id === 'postShiftBreakfast') continue
    if (!isBiologicalNightLocal(slot.time)) continue

    slot.biologicalNight = true
    slot.role = 'overnight_light_fuel'

    const maxShare = slot.id === 'nightSnack' ? MAX_SHARE_NIGHT_SNACK_ID : MAX_SHARE_OVERNIGHT_DEFAULT
    const maxKcal = Math.round(total * maxShare)
    if (slot.caloriesTarget > maxKcal) {
      slot.kcalCapped = true
      slot.caloriesTarget = maxKcal
    }

    if (slot.id === 'nightSnack') {
      slot.label = 'Small overnight snack'
      slot.hint =
        'Optional light fuel only if you need it — small, easy to digest during the biological night (roughly midnight until near dawn).'
      slot.subtitle = 'Not a main meal — keep portions small.'
    } else if (slot.id === 'midShift') {
      slot.label = 'Early shift fuel'
      slot.hint =
        'Lighter fuel on shift during the biological night — avoid a heavy sit-down meal at this clock time.'
    } else {
      if (/\bmeal\b/i.test(slot.label)) {
        slot.label = slot.label.replace(/\bmeal\b/gi, 'snack')
      }
      slot.hint = `${slot.hint} Keep it light overnight.`.trim()
    }
  }

  // Function-first labels for key night slots (even outside 00–06 where applicable)
  for (const slot of slots) {
    if (slot.id === 'preShift') {
      slot.label = 'Pre-shift main meal'
    } else if (slot.id === 'postShiftBreakfast') {
      if (/wake/i.test(slot.label)) {
        slot.label = 'First meal after sleep'
      } else if (/post/i.test(slot.label)) {
        // Soft copy: late clock times must not read like a full dinner before sleep.
        slot.label = 'Light post-shift bite before sleep'
        slot.hint =
          'Keep this small and easy to digest after a late finish — not a full sit-down meal right before bed.'
        slot.subtitle = 'Small fuel only — wind-down for sleep.'
      }
    }
  }

  let freedKcal = 0
  for (let i = 0; i < slots.length; i++) {
    freedKcal += initialKcal[i]! - slots[i]!.caloriesTarget
  }

  if (freedKcal > 0) {
    const pre = slots.find((s) => s.id === 'preShift')
    if (pre) {
      pre.caloriesTarget += freedKcal
    }
  }
}
