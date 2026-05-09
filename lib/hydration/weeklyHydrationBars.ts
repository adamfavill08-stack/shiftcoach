import { addCalendarDaysToYmd, startOfLocalDayUtcMs } from '@/lib/sleep/utils'
import {
  hydrationDayKeyFromTimestamp,
  startOfHydrationDayUtcMsForKey,
} from '@/lib/hydration/hydrationDayWindow'

export type WeeklyHydrationBarsPayload = {
  todayHydrationDayKey: string
  dayKeys: string[]
  days: string[]
  hydrationTargetMl: number[]
  hydrationActualMl: number[]
}

/**
 * Seven hydration “days” (05:00→05:00 in `timeZone`) ending at the window that contains `now`.
 */
export async function buildWeeklyHydrationBarsPayload(
  supabase: any,
  userId: string,
  timeZone: string,
  targetWaterMl: number,
  now: Date = new Date(),
): Promise<WeeklyHydrationBarsPayload> {
  const todayKey = hydrationDayKeyFromTimestamp(now, timeZone)
  const dayKeys: string[] = []
  for (let i = 6; i >= 0; i--) {
    dayKeys.push(addCalendarDaysToYmd(todayKey, -i))
  }

  const firstStart = startOfHydrationDayUtcMsForKey(dayKeys[0]!, timeZone)
  const lastEnd = startOfHydrationDayUtcMsForKey(addCalendarDaysToYmd(dayKeys[6]!, 1), timeZone)
  const startIso = new Date(firstStart).toISOString()
  const endIso = new Date(lastEnd).toISOString()

  const { data } = await supabase
    .from('water_logs')
    .select('ml,ts')
    .eq('user_id', userId)
    .gte('ts', startIso)
    .lt('ts', endIso)

  const byDay = new Map<string, number>()
  for (const k of dayKeys) byDay.set(k, 0)
  for (const r of data ?? []) {
    const ts = typeof r.ts === 'string' ? r.ts : null
    if (!ts) continue
    const key = hydrationDayKeyFromTimestamp(ts, timeZone)
    if (!byDay.has(key)) continue
    byDay.set(key, (byDay.get(key) ?? 0) + (Number(r.ml) || 0))
  }

  const hydrationActualMl = dayKeys.map((k) => Math.max(0, Math.round(byDay.get(k) ?? 0)))
  const t = Math.max(0, Math.round(targetWaterMl))
  const hydrationTargetMl = dayKeys.map(() => t)

  const days = dayKeys.map((key) => {
    const noonMs = startOfLocalDayUtcMs(key, timeZone) + 12 * 3600000
    if (!Number.isFinite(noonMs)) {
      return new Date().toLocaleDateString('en-GB', { weekday: 'short', timeZone })
    }
    return new Date(noonMs).toLocaleDateString('en-GB', { weekday: 'short', timeZone })
  })

  return {
    todayHydrationDayKey: todayKey,
    dayKeys,
    days,
    hydrationTargetMl,
    hydrationActualMl,
  }
}

/** Short weekday label for the hydration day that contains `instant` (for highlighting “today”). */
export function shortWeekdayForHydrationInstant(instant: Date, timeZone: string): string {
  const key = hydrationDayKeyFromTimestamp(instant, timeZone)
  const noonMs = startOfLocalDayUtcMs(key, timeZone) + 12 * 3600000
  if (!Number.isFinite(noonMs)) {
    return new Date(instant).toLocaleDateString('en-GB', { weekday: 'short', timeZone })
  }
  return new Date(noonMs).toLocaleDateString('en-GB', { weekday: 'short', timeZone })
}
