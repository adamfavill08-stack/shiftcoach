/**
 * Real-world persona snapshots: planner output + provenance + display copy + schedule context.
 * These are scenario contracts — they should fail if timing/copy drifts without an intentional product change.
 */
import { describe, it, expect } from 'vitest'
import { getTodayMealSchedule, type MealSlot } from '@/lib/nutrition/getTodayMealSchedule'
import { buildServerMealScheduleMeta, type MealScheduleReason } from '@/lib/nutrition/mealScheduleProvenance'
import { getMealSlotDisplayCopy, getScheduleContextSubtitle } from '@/lib/nutrition/getMealSlotDisplayCopy'
import { isBiologicalNightLocal } from '@/lib/nutrition/applyBiologicalNightMealPolicy'
import type { GuidanceMode, OffDayContext } from '@/lib/shift-context/types'
import type { WakeAnchorRhythm } from '@/lib/nutrition/resolveDiurnalWakeAnchor'

const ADJ = 2000

function slotInput(s: MealSlot) {
  return {
    id: s.id,
    label: s.label,
    hint: s.hint,
    subtitle: s.subtitle,
    ...(s.role ? { role: String(s.role) } : {}),
    biologicalNight: s.biologicalNight,
    kcalCapped: s.kcalCapped,
  }
}

function evaluate(opts: {
  adjustedCalories?: number
  shiftType: 'day' | 'night' | 'late' | 'off'
  shiftStart?: Date
  shiftEnd?: Date
  wakeTime: Date
  guidanceMode?: GuidanceMode
  offDayContext?: OffDayContext | null
  expectedSleepHours?: number
  loggedWakeAfterShift?: Date | null
  templateUsed: 'day' | 'night' | 'late' | 'off'
  rhythmMode: WakeAnchorRhythm
}) {
  const adjustedCalories = opts.adjustedCalories ?? ADJ
  const { slots, provenance, templateUsed } = getTodayMealSchedule({
    adjustedCalories,
    shiftType: opts.shiftType,
    shiftStart: opts.shiftStart,
    shiftEnd: opts.shiftEnd,
    wakeTime: opts.wakeTime,
    guidanceMode: opts.guidanceMode,
    offDayContext: opts.offDayContext ?? null,
    expectedSleepHours: opts.expectedSleepHours,
    loggedWakeAfterShift: opts.loggedWakeAfterShift ?? null,
  })
  expect(templateUsed).toBe(opts.templateUsed)

  const meta = buildServerMealScheduleMeta({
    provenance,
    shiftType: opts.shiftType,
    guidanceMode: (opts.guidanceMode ?? 'day_shift') as GuidanceMode,
    rhythmMode: opts.rhythmMode,
    templateUsed,
  })
  const scheduleContextSubtitle = getScheduleContextSubtitle(meta) ?? null
  const displays = slots.map((s) => ({ id: s.id, ...getMealSlotDisplayCopy(slotInput(s), meta) }))
  return { slots, provenance, meta, scheduleContextSubtitle, displays }
}

function assertKcalNearAdjusted(slots: MealSlot[], adjusted: number, opts?: { offNightBridge?: boolean }) {
  const sum = slots.reduce((a, s) => a + s.caloriesTarget, 0)
  if (opts?.offNightBridge) {
    // Off night-bridge templates use fixed percentage shares that can sum slightly under adjustedCalories.
    expect(sum).toBeGreaterThanOrEqual(Math.round(adjusted * 0.92))
    expect(sum).toBeLessThanOrEqual(adjusted)
  } else {
    expect(Math.abs(sum - adjusted)).toBeLessThanOrEqual(4)
  }
}

function assertChronological(slots: MealSlot[]) {
  for (let i = 1; i < slots.length; i++) {
    expect(slots[i]!.time.getTime()).toBeGreaterThanOrEqual(slots[i - 1]!.time.getTime())
  }
}

/** Local wall-clock 00:00–05:59 (planner biological-night band). */
function inDeepNight(d: Date): boolean {
  return isBiologicalNightLocal(d)
}

function assertLargestKcalNotInDeepNight(slots: MealSlot[]) {
  if (slots.length === 0) return
  const maxK = Math.max(...slots.map((s) => s.caloriesTarget))
  const maxSlots = slots.filter((s) => s.caloriesTarget === maxK)
  for (const s of maxSlots) {
    expect(
      inDeepNight(s.time),
      `Largest kcal slot (${s.id} @ ${s.time.toISOString()}, ${s.caloriesTarget} kcal) should not sit in 00:00–05:59`,
    ).toBe(false)
  }
}

function assertReason(meta: { scheduleReason: MealScheduleReason[] }, r: MealScheduleReason) {
  expect(meta.scheduleReason).toContain(r)
}

/**
 * Biological-night slots should not be *marketed* as a full sit-down meal in the title.
 * (Planner hints may still say “avoid a heavy sit-down meal” as guidance — that is intentional.)
 */
function assertBioSlotTitlesAvoidLargeMealMarketing(
  displays: { id: string; title: string }[],
  slots: MealSlot[],
) {
  for (const s of slots) {
    if (!s.biologicalNight) continue
    const row = displays.find((d) => d.id === s.id)
    expect(row, `display row for bio slot ${s.id}`).toBeDefined()
    const t = row!.title.toLowerCase()
    expect(t).not.toMatch(/post-shift meal|main on-shift meal|^dinner$|^lunch$/)
    expect(t).toMatch(/fuel|snack|light|small|overnight|early|late-shift|optional/i)
  }
}

/** Post-midnight fuel after clock-off should read as a light bite, not a full dinner. */
function assertPostMidnightPostShiftLight(slots: MealSlot[], displays: { id: string; title: string }[]) {
  const byId = Object.fromEntries(displays.map((d) => [d.id, d])) as Record<string, { title: string }>
  for (const s of slots) {
    const h = s.time.getHours()
    if (!(h >= 0 && h < 6)) continue
    if (s.id !== 'dinner' && s.id !== 'postShiftBreakfast') continue
    const title = byId[s.id]?.title ?? s.label
    expect(title.toLowerCase()).toMatch(/light|bite|small|optional|snack|fuel/)
  }
}

function assertNotPlainTraditionalMealClock(titles: string[]) {
  for (const t of titles) {
    const plain = t.trim()
    expect(['Breakfast', 'Lunch', 'Dinner']).not.toContain(plain)
  }
}

describe('meal timing persona snapshots', () => {
  it('1) standard day shift 09:00–17:00', () => {
    const wake = new Date(2026, 5, 10, 7, 30)
    const start = new Date(2026, 5, 10, 9, 0)
    const end = new Date(2026, 5, 10, 17, 0)
    const { slots, meta, scheduleContextSubtitle, displays } = evaluate({
      shiftType: 'day',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
      templateUsed: 'day',
      rhythmMode: 'day_rhythm',
      guidanceMode: 'day_shift',
    })
    expect(slots).toHaveLength(4)
    assertChronological(slots)
    assertKcalNearAdjusted(slots, ADJ)
    assertReason(meta, 'standard_day')
    expect(meta.scheduleReason).not.toContain('long_day')
    expect(scheduleContextSubtitle).toBeNull()
    assertLargestKcalNotInDeepNight(slots)
    const titles = displays.map((d) => d.title)
    expect(titles.join(' ')).toMatch(/shift|Pre|Post|evening|bite/i)
    assertNotPlainTraditionalMealClock(titles.filter((_, i) => slots[i]!.id !== 'lunch'))
  })

  it('2) long day shift 07:00–19:00', () => {
    const wake = new Date(2026, 5, 10, 6, 0)
    const start = new Date(2026, 5, 10, 7, 0)
    const end = new Date(2026, 5, 10, 19, 0)
    const { slots, meta, scheduleContextSubtitle, displays } = evaluate({
      shiftType: 'day',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
      templateUsed: 'day',
      rhythmMode: 'day_rhythm',
      guidanceMode: 'day_shift',
    })
    expect(slots).toHaveLength(4)
    assertChronological(slots)
    assertKcalNearAdjusted(slots, ADJ)
    assertReason(meta, 'long_day')
    expect(scheduleContextSubtitle).toContain('Long day shift')
    assertLargestKcalNotInDeepNight(slots)
    const daySnack = displays.find((d) => d.id === 'daySnack')
    expect(daySnack?.title).toBe('Light on-shift fuel')
    const main = displays.find((d) => d.id === 'midShift')
    expect(main?.title).toBe('Main on-shift meal')
  })

  it('3) standard late shift 14:00–22:00', () => {
    const wake = new Date(2026, 5, 10, 8, 0)
    const start = new Date(2026, 5, 10, 14, 0)
    const end = new Date(2026, 5, 10, 22, 0)
    const { slots, meta, scheduleContextSubtitle, displays } = evaluate({
      shiftType: 'late',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
      templateUsed: 'late',
      rhythmMode: 'day_rhythm',
      guidanceMode: 'day_shift',
    })
    expect(slots).toHaveLength(4)
    assertChronological(slots)
    assertKcalNearAdjusted(slots, ADJ)
    assertReason(meta, 'standard_late')
    expect(meta.scheduleReason).not.toContain('long_late')
    expect(scheduleContextSubtitle).toBeNull()
    assertLargestKcalNotInDeepNight(slots)
    const post = displays.find((d) => d.id === 'dinner')
    expect(post?.title).toMatch(/Post|shift|light/i)
  })

  it('4) long late shift 14:00–00:00', () => {
    const wake = new Date(2026, 5, 10, 7, 0)
    const start = new Date(2026, 5, 10, 14, 0)
    const end = new Date(2026, 5, 11, 0, 0)
    const { slots, meta, scheduleContextSubtitle, displays } = evaluate({
      shiftType: 'late',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
      templateUsed: 'late',
      rhythmMode: 'day_rhythm',
      guidanceMode: 'day_shift',
    })
    expect(slots.length).toBeGreaterThanOrEqual(4)
    expect(slots.length).toBeLessThanOrEqual(5)
    assertChronological(slots)
    assertKcalNearAdjusted(slots, ADJ)
    assertReason(meta, 'long_late')
    expect(scheduleContextSubtitle).toContain('Long late shift')
    assertLargestKcalNotInDeepNight(slots)
    const post = slots.find((s) => s.id === 'dinner')
    expect(post?.label).toMatch(/Light post-shift bite before sleep/i)
    const postD = displays.find((d) => d.id === 'dinner')
    expect(postD?.title).toBe('Light post-shift bite before sleep')
    assertPostMidnightPostShiftLight(slots, displays)
  })

  it('5) standard night shift 22:00–07:00 (morning end)', () => {
    const wake = new Date(2026, 5, 2, 10, 0)
    const start = new Date(2026, 5, 1, 22, 0)
    const end = new Date(2026, 5, 2, 7, 0)
    const { slots, meta, scheduleContextSubtitle, displays } = evaluate({
      shiftType: 'night',
      shiftStart: start,
      shiftEnd: end,
      wakeTime: wake,
      templateUsed: 'night',
      rhythmMode: 'night_rhythm',
      guidanceMode: 'night_shift',
      expectedSleepHours: 7.5,
      loggedWakeAfterShift: null,
    })
    expect(slots.length).toBeGreaterThanOrEqual(4)
    expect(slots.length).toBeLessThanOrEqual(5)
    assertChronological(slots)
    assertKcalNearAdjusted(slots, ADJ)
    assertReason(meta, 'standard_night')
    assertReason(meta, 'biological_night_policy')
    expect(scheduleContextSubtitle).toContain('Overnight food is kept lighter')
    assertLargestKcalNotInDeepNight(slots)
    assertBioSlotTitlesAvoidLargeMealMarketing(displays, slots)
    const pre = displays.find((d) => d.id === 'preShift')
    expect(pre?.title).toMatch(/Pre-shift main meal|Pre/)
    const nightSnackSlot = slots.find((s) => s.id === 'nightSnack')
    expect(nightSnackSlot?.biologicalNight).toBe(true)
    const overnight = displays.find((d) => d.id === 'nightSnack')
    expect(overnight?.title).toMatch(/Small overnight snack|Light overnight fuel/)
  })

  it('6) off before first night (anchored to upcoming 22:00–07:00)', () => {
    const wake = new Date(2026, 5, 10, 8, 0)
    const nightStart = new Date(2026, 5, 10, 22, 0)
    const nightEnd = new Date(2026, 5, 11, 7, 0)
    const { slots, meta, scheduleContextSubtitle, displays } = evaluate({
      shiftType: 'off',
      shiftStart: nightStart,
      shiftEnd: nightEnd,
      wakeTime: wake,
      offDayContext: 'before_first_night',
      templateUsed: 'off',
      rhythmMode: 'transition_to_night',
      guidanceMode: 'off_day',
    })
    expect(slots).toHaveLength(6)
    assertChronological(slots)
    assertKcalNearAdjusted(slots, ADJ, { offNightBridge: true })
    assertReason(meta, 'off_before_first_night')
    assertReason(meta, 'biological_night_policy')
    expect(scheduleContextSubtitle).toContain('Off today')
    expect(scheduleContextSubtitle).not.toContain('Preparing your meals around your first night shift tonight.')
    assertLargestKcalNotInDeepNight(slots)
    assertBioSlotTitlesAvoidLargeMealMarketing(displays, slots)
    const pre = slots.find((s) => s.id === 'preShift')
    expect(pre?.time.getHours()).toBe(18)
    expect(pre?.time.getMinutes()).toBe(30)
  })

  it('7) off between nights', () => {
    const wake = new Date(2026, 5, 10, 8, 0)
    const nightStart = new Date(2026, 5, 10, 22, 0)
    const nightEnd = new Date(2026, 5, 11, 7, 0)
    const { slots, meta, scheduleContextSubtitle, displays } = evaluate({
      shiftType: 'off',
      shiftStart: nightStart,
      shiftEnd: nightEnd,
      wakeTime: wake,
      offDayContext: 'between_nights',
      templateUsed: 'off',
      rhythmMode: 'night_rhythm',
      guidanceMode: 'off_day',
    })
    expect(slots).toHaveLength(6)
    expect(slots.find((s) => s.id === 'dinner')).toBeUndefined()
    assertChronological(slots)
    assertKcalNearAdjusted(slots, ADJ, { offNightBridge: true })
    assertReason(meta, 'off_between_nights')
    assertReason(meta, 'biological_night_policy')
    expect(scheduleContextSubtitle).toContain('Recovery day between night shifts')
    assertLargestKcalNotInDeepNight(slots)
    assertBioSlotTitlesAvoidLargeMealMarketing(displays, slots)
  })

  it('8) off after final night', () => {
    const wake = new Date(2026, 5, 10, 12, 0)
    const { slots, meta, scheduleContextSubtitle, displays } = evaluate({
      shiftType: 'off',
      wakeTime: wake,
      offDayContext: 'after_final_night',
      templateUsed: 'off',
      rhythmMode: 'recovery_from_night',
      guidanceMode: 'off_day',
    })
    expect(slots).toHaveLength(4)
    assertChronological(slots)
    assertKcalNearAdjusted(slots, ADJ)
    assertReason(meta, 'off_after_final_night')
    expect(scheduleContextSubtitle).toContain('Recovering after your final night')
    assertLargestKcalNotInDeepNight(slots)
    const dinner = displays.find((d) => d.id === 'dinner')
    expect(dinner?.title).toBe('Recovery meal')
    const bf = displays.find((d) => d.id === 'breakfast')
    expect(bf?.title).toBe('Light breakfast')
  })
})
