/**
 * AI-based sleep stage estimation for manual sleep entries
 * Estimates Deep, REM, Light, and Awake percentages based on:
 * - Total sleep duration
 * - Sleep quality rating
 * - Time of day (night vs day sleep)
 * - Sleep timing (bedtime hour)
 * 
 * Ready for wearable device sync - wearable data will override these estimates
 */

export type SleepStagePercentages = {
  deep: number
  rem: number
  light: number
  awake: number
}

type EstimateInput = {
  durationHours: number // Total sleep duration in hours
  quality?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | number | null // Quality rating
  bedtimeHour?: number // Hour of day when sleep started (0-23)
  isDaySleep?: boolean // True if this is daytime sleep (for shift workers)
}

/**
 * Estimate sleep stage percentages based on sleep characteristics
 * Uses research-based heuristics for typical sleep architecture
 */
export function estimateSleepStages(input: EstimateInput): SleepStagePercentages {
  const { durationHours, quality, bedtimeHour, isDaySleep = false } = input
  
  // Normalize quality to a 0-1 scale
  let qualityScore = 0.7 // Default to "Fair"
  if (typeof quality === 'number') {
    qualityScore = quality / 5 // 1-5 scale -> 0.2-1.0
  } else if (quality === 'Excellent') {
    qualityScore = 1.0
  } else if (quality === 'Good') {
    qualityScore = 0.85
  } else if (quality === 'Fair') {
    qualityScore = 0.7
  } else if (quality === 'Poor') {
    qualityScore = 0.5
  }
  
  // Base percentages for a healthy 8-hour night sleep
  // Typical distribution: Deep 15-20%, REM 20-25%, Light 50-55%, Awake 5-10%
  let baseDeep = 18
  let baseREM = 22
  let baseLight = 52
  let baseAwake = 8
  
  // Adjust for sleep duration
  if (durationHours < 6) {
    // Short sleep: less REM, more light, more awake
    baseDeep = Math.max(12, baseDeep - 2)
    baseREM = Math.max(15, baseREM - 5)
    baseLight = Math.min(60, baseLight + 5)
    baseAwake = Math.min(15, baseAwake + 5)
  } else if (durationHours >= 8 && durationHours <= 9) {
    // Optimal sleep: more REM and deep
    baseDeep = 20
    baseREM = 25
    baseLight = 48
    baseAwake = 7
  } else if (durationHours > 9) {
    // Long sleep: more light, less deep
    baseDeep = 15
    baseREM = 20
    baseLight = 58
    baseAwake = 7
  }
  
  // Adjust for quality - STRONG IMPACT
  // Poor quality = significantly more awake, much less deep/REM
  // Excellent quality = significantly more deep/REM, much less awake
  // Quality has a major impact on sleep architecture
  const qualityMultiplier = qualityScore
  
  // Deep sleep: Excellent = +40%, Poor = -50%
  baseDeep = Math.round(baseDeep * (0.5 + 0.5 * qualityMultiplier))
  
  // REM sleep: Excellent = +30%, Poor = -40%
  baseREM = Math.round(baseREM * (0.6 + 0.4 * qualityMultiplier))
  
  // Awake time: Excellent = -60%, Poor = +100%
  baseAwake = Math.round(baseAwake * (2.0 - 1.0 * qualityMultiplier))
  
  // Light sleep adjusts to balance (more light sleep when quality is poor)
  if (qualityScore < 0.7) {
    // Poor/Fair quality: more light sleep (less efficient)
    baseLight = Math.min(65, baseLight + Math.round((0.7 - qualityScore) * 10))
  } else {
    // Good/Excellent quality: less light sleep (more efficient)
    baseLight = Math.max(45, baseLight - Math.round((qualityScore - 0.7) * 8))
  }
  
  // Adjust for daytime sleep (shift workers)
  // Day sleep typically has less deep sleep, more light sleep
  if (isDaySleep) {
    baseDeep = Math.max(10, baseDeep - 5)
    baseREM = Math.max(15, baseREM - 3)
    baseLight = Math.min(65, baseLight + 8)
    baseAwake = Math.min(12, baseAwake + 2)
  }
  
  // Adjust for bedtime timing
  // Very late bedtimes (after 2 AM) or very early (before 9 PM) can affect stages
  if (bedtimeHour !== undefined) {
    if (bedtimeHour >= 2 && bedtimeHour < 6) {
      // Very late bedtime: less deep sleep
      baseDeep = Math.max(12, baseDeep - 3)
      baseREM = Math.max(18, baseREM - 2)
    } else if (bedtimeHour >= 21 && bedtimeHour < 23) {
      // Early bedtime: slightly more deep sleep
      baseDeep = Math.min(22, baseDeep + 2)
    }
  }
  
  // Normalize to ensure percentages sum to 100
  const total = baseDeep + baseREM + baseLight + baseAwake
  const deep = Math.round((baseDeep / total) * 100)
  const rem = Math.round((baseREM / total) * 100)
  const light = Math.round((baseLight / total) * 100)
  const awake = 100 - deep - rem - light // Ensure it sums to 100
  
  return {
    deep: Math.max(0, Math.min(100, deep)),
    rem: Math.max(0, Math.min(100, rem)),
    light: Math.max(0, Math.min(100, light)),
    awake: Math.max(0, Math.min(100, awake)),
  }
}

