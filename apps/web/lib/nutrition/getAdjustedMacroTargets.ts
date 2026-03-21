export type MacroTargets = {
  proteinTargetG: number
  carbTargetG: number
  fatTargetG: number
  saturatedFatMaxG: number
  hydrationTargetMl: number
}

export type MacroContext = {
  adjustedCalories: number
  baseProteinG: number
  baseCarbG: number
  baseFatG: number
  baseHydrationMl: number
  sleepHoursLast24?: number
  mainSleepStart?: Date | string
  mainSleepEnd?: Date | string
  shiftType?: 'day' | 'late' | 'night' | 'off'
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function getAdjustedMacroTargets(ctx: MacroContext): MacroTargets {
  const kcal = Math.max(1200, Math.round(ctx.adjustedCalories || 0))
  const sleep = Math.max(0, ctx.sleepHoursLast24 ?? 0)

  // Sleep amount factor (not directly used in math below but available for blending later)
  const sleepAmountFactor = clamp(sleep / 7.5, 0.7, 1.1)

  const start = ctx.mainSleepStart ? new Date(ctx.mainSleepStart) : undefined
  const end = ctx.mainSleepEnd ? new Date(ctx.mainSleepEnd) : undefined
  let sleepTiming: 'nightAligned' | 'daySleep' | 'mixed' = 'mixed'
  if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
    const midpointMs = (start.getTime() + end.getTime()) / 2
    const midpointHour = new Date(midpointMs).getHours() // 0–23
    if (midpointHour >= 22 || midpointHour < 6) sleepTiming = 'nightAligned'
    else if (midpointHour >= 8 && midpointHour <= 15) sleepTiming = 'daySleep'
    else sleepTiming = 'mixed'
  }

  let protein = ctx.baseProteinG
  let carbs = ctx.baseCarbG
  let fats = ctx.baseFatG
  let hydration = ctx.baseHydrationMl

  // Short sleep adjustments
  if (sleep > 0 && sleep <= 6) {
    protein *= 1.1
    carbs *= 0.9
    hydration *= 1.1
  }

  // Very good sleep
  if (sleep >= 8) {
    protein *= 1.0
    carbs *= 1.05
    fats *= 1.0
  }

  // Daytime sleep (night-shift recovery)
  if (sleepTiming === 'daySleep') {
    protein *= 1.05
    carbs *= 0.9
    hydration *= 1.1
  }

  // Night-aligned sleep → tiny nudge only (already near base)
  if (sleepTiming === 'nightAligned') {
    protein *= 1.0
    carbs *= 1.0
    fats *= 1.0
  }

  // Clamp relative to calories
  const maxProtein = kcal / 2 / 4 // 50% kcal from protein
  const maxCarbs = kcal / 4 / 4   // 25% kcal from carbs
  const maxFats = kcal / 3 / 9    // ~33% kcal from fat

  protein = clamp(protein, 40, maxProtein)
  carbs = clamp(carbs, 60, maxCarbs)
  fats = clamp(fats, 20, maxFats)
  hydration = clamp(hydration, 1500, 3500)

  // Saturated fat as a max limit
  const satFromKcal = (kcal * 0.1) / 9
  const satFromFat = fats * 0.25
  let saturatedFatMaxG = Math.min(satFromKcal, satFromFat)
  saturatedFatMaxG = clamp(saturatedFatMaxG, 5, 25)

  return {
    proteinTargetG: Math.round(protein),
    carbTargetG: Math.round(carbs),
    fatTargetG: Math.round(fats),
    saturatedFatMaxG: Math.round(saturatedFatMaxG),
    hydrationTargetMl: Math.round(hydration),
  }
}


