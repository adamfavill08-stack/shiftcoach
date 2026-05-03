const YMD = /^\d{4}-\d{2}-\d{2}$/

/**
 * Health Connect may send multiple payloads for the same civil day; sum steps per `activityDate`
 * so the server persists one total per day (matches native readRecords sum semantics).
 */
export function mergeHealthConnectDailyStepsByDate(
  rows: readonly { activityDate: string; steps: number }[],
): { activityDate: string; steps: number }[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const d = String(r.activityDate ?? '').trim().slice(0, 10)
    if (!YMD.test(d)) continue
    const s = typeof r.steps === 'number' && Number.isFinite(r.steps) ? Math.max(0, Math.round(r.steps)) : 0
    m.set(d, (m.get(d) ?? 0) + s)
  }
  return [...m.entries()]
    .map(([activityDate, steps]) => ({ activityDate, steps }))
    .sort((a, b) => a.activityDate.localeCompare(b.activityDate))
}
