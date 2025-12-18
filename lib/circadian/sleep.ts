/**
 * Shared sleep deficit calculation for circadian engine
 * Reuses the same logic as /api/sleep/deficit
 */

import type { SleepDeficitResponse } from '@/lib/sleep/calculateSleepDeficit'
import { calculateSleepDeficit } from '@/lib/sleep/calculateSleepDeficit'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Calculate sleep deficit for circadian engine
 * Returns the same structure as /api/sleep/deficit
 */
export async function getSleepDeficitForCircadian(
  supabase: SupabaseClient,
  userId: string,
  requiredDailyHours: number = 7.5
): Promise<SleepDeficitResponse | null> {
  try {
    const now = new Date()
    const sevenAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0)
    
    const getLocalDateString = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    const getLocalDateFromISO = (isoString: string): string => {
      const date = new Date(isoString)
      return getLocalDateString(date)
    }

    const minutesBetween = (a: string | Date, b: string | Date) => {
      return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000))
    }

    // Fetch sleep data for last 7 days
    let weekLogs: any[] = []
    let weekResult = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('start_at', sevenAgo.toISOString())
      .order('start_at', { ascending: true })
    
    weekLogs = weekResult.data || []
    
    if (weekResult.error && (weekResult.error.message?.includes("start_at") || weekResult.error.code === 'PGRST204')) {
      weekResult = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('start_ts', sevenAgo.toISOString())
        .order('start_ts', { ascending: true })
      weekLogs = weekResult.data || []
    }

    if (weekResult.error) {
      console.warn('[circadian/sleep] Failed to fetch sleep data for deficit:', weekResult.error.message)
      return null
    }

    // Aggregate by day
    const byDay: Record<string, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + i, 12, 0, 0, 0)
      const key = getLocalDateString(d)
      byDay[key] = 0
    }

    // Filter for main sleep sessions only (not naps) - same logic as deficit API
    const mainSleepLogs = weekLogs.filter((row: any) => {
      if (row.type !== undefined) {
        // New schema: type === 'sleep' or 'main'
        return row.type === 'sleep' || row.type === 'main'
      } else {
        // Old schema: naps === 0 or null
        return row.naps === 0 || row.naps === null || !row.naps
      }
    })

    for (const row of mainSleepLogs ?? []) {
      const endTime = row.end_at || row.end_ts
      const startTime = row.start_at || row.start_ts
      if (!endTime || !startTime) continue
      
      let key: string
      if (row.date) {
        key = row.date.slice(0, 10)
      } else {
        key = getLocalDateFromISO(endTime)
      }
      
      if (byDay[key] !== undefined) {
        byDay[key] += minutesBetween(startTime, endTime)
      }
    }

    const sleepData = Object.entries(byDay).map(([date, totalMinutes]) => ({
      date,
      totalMinutes,
    }))

    return calculateSleepDeficit(sleepData, requiredDailyHours)
  } catch (err) {
    console.warn('[circadian/sleep] Error calculating sleep deficit:', err)
    return null
  }
}

