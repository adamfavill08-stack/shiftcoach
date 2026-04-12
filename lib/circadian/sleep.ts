/**
 * Shared sleep deficit calculation for circadian engine
 * Uses the same aggregation as GET /api/sleep/deficit (primary sleep_logs, else merged OS sleep_records).
 */

import type { SleepDeficitResponse } from '@/lib/sleep/calculateSleepDeficit'
import { aggregateSleepMinutesForDeficitWindow } from '@/lib/sleep/aggregateSleepMinutesForDeficitWindow'
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
    const agg = await aggregateSleepMinutesForDeficitWindow(supabase, userId)
    if (!agg.ok) {
      if (agg.isMissingRelation) {
        return calculateSleepDeficit([], requiredDailyHours)
      }
      console.warn('[circadian/sleep] Failed to fetch sleep data for deficit:', agg.error.message)
      return null
    }

    return calculateSleepDeficit(agg.sleepData, requiredDailyHours)
  } catch (err) {
    console.warn('[circadian/sleep] Error calculating sleep deficit:', err)
    return null
  }
}
