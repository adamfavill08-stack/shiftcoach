/**
 * Shared UI rows for calorie target explanation (dashboard detail + /adjusted-calories page).
 * Values match the server `modifierChain` + guard remainder from `/api/nutrition/today`.
 */

export type ModifierChainItem = {
  id: string
  factor: number
  deltaKcal: number
  runningKcal: number
}

export type CalorieBreakdownInput = {
  baseCalories: number
  adjustedCalories: number
  palBaseCalories?: number | null
  goalAdjustmentKcal?: number | null
  rhythmScore: number | null
  sleepHoursLast24h: number | null
  sleepNapHours?: number | null
  shiftType: 'day' | 'night' | 'off' | 'early' | 'late' | 'other'
  rhythmFactor: number
  sleepFactor: number
  shiftFactor: number
  shiftActivityFactor?: number
  dailyActivityFactor?: number
  activityLevel?: string | null
  modifierChain?: ModifierChainItem[]
  modifierGuardDeltaKcal?: number
  guardRailApplied?: boolean
}

function ensureModifierChain(data: CalorieBreakdownInput): ModifierChainItem[] {
  let chain = data.modifierChain ?? []
  if (chain.length === 0 && data.baseCalories > 0) {
    let running = data.baseCalories
    const factors: Array<[string, number]> = [
      ['rhythm', data.rhythmFactor],
      ['sleep', data.sleepFactor],
      ['shift', data.shiftFactor],
      ['shift_activity', data.shiftActivityFactor ?? 1],
      ['daily_activity', data.dailyActivityFactor ?? 1],
    ]
    chain = factors.map(([id, f]) => {
      const prev = running
      running = prev * f
      return {
        id,
        factor: f,
        deltaKcal: Math.round(running - prev),
        runningKcal: Math.round(running),
      }
    })
  }
  return chain
}

/** Grouped snapshot: activity = shift load + steps; recovery = remainder (incl. guard). */
export function getCalorieSnapshotGrouped(data: CalorieBreakdownInput): {
  chain: ModifierChainItem[]
  activityDelta: number
  recoveryDelta: number
  deltaPct: number
} {
  const chain = ensureModifierChain(data)
  const base = data.baseCalories
  const adjusted = data.adjustedCalories
  const totalDelta = adjusted - base
  const activityDelta = chain
    .filter((m) => m.id === 'shift_activity' || m.id === 'daily_activity')
    .reduce((s, m) => s + m.deltaKcal, 0)
  const recoveryDelta = totalDelta - activityDelta
  const deltaPct = base > 0 ? Math.round((totalDelta / base) * 100) : 0
  return { chain, activityDelta, recoveryDelta, deltaPct }
}

export function buildCalorieBreakdownRows(
  data: CalorieBreakdownInput,
  t: (key: string) => string,
): Array<{ key: string; label: string; value: string; color: string }> {
  const baseCalories = data.baseCalories
  const palBase = data.palBaseCalories ?? null
  const goalAdj = data.goalAdjustmentKcal ?? null
  const rhythmScore = data.rhythmScore ?? null
  const sleepHours = data.sleepHoursLast24h ?? null
  const sleepNap = data.sleepNapHours ?? null
  const shiftType = data.shiftType ?? null
  const guardDelta = data.modifierGuardDeltaKcal ?? 0
  const guardRailApplied = data.guardRailApplied ?? false

  const shiftScheduleLabel = () => {
    if (shiftType === 'night') return t('dashboard.shiftLabel.night')
    if (shiftType === 'day') return t('dashboard.shiftLabel.day')
    if (shiftType === 'off') return t('dashboard.shiftLabel.dayOff')
    if (shiftType === 'late') return t('dashboard.shiftLabel.late')
    if (shiftType === 'early') return t('dashboard.calories.shiftEarly')
    return t('dashboard.shiftLabel.shift')
  }

  const modifierLabel = (id: string) => {
    switch (id) {
      case 'rhythm':
        return rhythmScore != null
          ? `${t('dashboard.rhythm')} ${Math.round(rhythmScore)}`
          : t('dashboard.rhythm')
      case 'sleep':
        return sleepHours != null
          ? `${sleepHours.toFixed(1)}h — ${t('dashboard.calories.sleepShiftDay')}${
              sleepNap != null && sleepNap > 0.05 ? ` (${sleepNap.toFixed(1)}h nap)` : ''
            }`
          : t('dashboard.calories.sleepShiftDay')
      case 'shift':
        return `${t('dashboard.calories.shiftSchedule')} (${shiftScheduleLabel()})`
      case 'shift_activity':
        return data.activityLevel
          ? `${t('dashboard.calories.shiftWorkload')} (${String(data.activityLevel).replace(/_/g, ' ')})`
          : t('dashboard.calories.shiftWorkloadNotLogged')
      case 'daily_activity':
        return t('dashboard.calories.stepsActivity')
      default:
        return id
    }
  }

  const chain = ensureModifierChain(data)

  const rows: Array<{ key: string; label: string; value: string; color: string }> = []

  if (palBase != null && palBase > 0) {
    rows.push({
      key: 'pal',
      label: t('dashboard.calories.palMaintenance'),
      value: palBase.toLocaleString('en-US'),
      color: 'text-slate-700 dark:text-slate-200',
    })
  }

  if (goalAdj != null && goalAdj !== 0) {
    rows.push({
      key: 'goal',
      label: t('dashboard.calories.goalAdjustment'),
      value: `${goalAdj >= 0 ? '+' : ''}${goalAdj.toLocaleString('en-US')}`,
      color: goalAdj >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
    })
  }

  rows.push({
    key: 'base',
    label: t('dashboard.calories.baseTarget'),
    value: baseCalories.toLocaleString('en-US'),
    color: 'text-slate-900 dark:text-slate-100',
  })

  for (const m of chain) {
    rows.push({
      key: m.id,
      label: modifierLabel(m.id),
      value: `${m.deltaKcal >= 0 ? '+' : ''}${m.deltaKcal.toLocaleString('en-US')}`,
      color:
        m.deltaKcal === 0
          ? 'text-slate-500 dark:text-slate-400'
          : m.deltaKcal >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400',
    })
  }

  if (Math.abs(guardDelta) >= 1) {
    rows.push({
      key: 'cap',
      label: guardRailApplied
        ? t('dashboard.calories.safetyCap')
        : t('dashboard.calories.targetRounding'),
      value: `${guardDelta >= 0 ? '+' : ''}${guardDelta.toLocaleString('en-US')}`,
      color: guardDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
    })
  }

  rows.push({
    key: 'final',
    label: t('dashboard.calories.finalTarget'),
    value: (data.adjustedCalories ?? 0).toLocaleString('en-US'),
    color: 'text-slate-900 dark:text-slate-100',
  })

  return rows
}
