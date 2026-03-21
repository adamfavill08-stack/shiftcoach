/**
 * Wearable Sleep Data Merger
 * Prepares the system for Apple Health / Google Fit integration
 * 
 * This is a placeholder that will be implemented when wearable sync is added.
 * For now, it provides the interface and basic structure.
 */

export interface WearableSleepBlock {
  source: 'apple_health' | 'google_fit' | 'manual'
  start_at: string
  end_at: string
  duration_minutes: number
  stages?: {
    awake: number
    rem: number
    light: number
    deep: number
  }
  confidence: number // 0-100
}

export interface ManualSleepBlock {
  id: string
  start_at: string
  end_at: string
  duration_minutes: number
  type: 'main' | 'nap'
  source: 'manual'
  quality?: number
}

export interface MergedSleepBlock {
  id: string
  start_at: string
  end_at: string
  duration_minutes: number
  source: 'wearable' | 'manual' | 'merged'
  wearableData?: WearableSleepBlock
  manualData?: ManualSleepBlock
  stages?: {
    awake: number
    rem: number
    light: number
    deep: number
  }
  confidence: number
}

/**
 * Merge wearable and manual sleep logs
 * 
 * Strategy:
 * 1. Prefer wearable data for precision
 * 2. Allow user manual overrides
 * 3. Avoid duplicates (within 30 min window)
 * 4. Merge overlapping sessions intelligently
 */
export function mergeWearableSleep(
  wearableBlocks: WearableSleepBlock[],
  manualBlocks: ManualSleepBlock[]
): MergedSleepBlock[] {
  const merged: MergedSleepBlock[] = []
  const processedManual = new Set<string>()
  
  // Process wearable blocks first (higher priority)
  for (const wearable of wearableBlocks) {
    // Check if there's a manual override within 30 minutes
    const manualOverride = manualBlocks.find(manual => {
      const wearableStart = new Date(wearable.start_at)
      const manualStart = new Date(manual.start_at)
      const diffMinutes = Math.abs(
        (wearableStart.getTime() - manualStart.getTime()) / (1000 * 60)
      )
      return diffMinutes <= 30 && !processedManual.has(manual.id)
    })
    
    if (manualOverride) {
      // User has manually logged this - prefer manual but keep wearable stages
      merged.push({
        id: manualOverride.id,
        start_at: manualOverride.start_at,
        end_at: manualOverride.end_at,
        duration_minutes: manualOverride.duration_minutes,
        source: 'merged',
        wearableData: wearable,
        manualData: manualOverride,
        stages: wearable.stages,
        confidence: Math.max(wearable.confidence, 80) // Manual has high confidence
      })
      processedManual.add(manualOverride.id)
    } else {
      // Pure wearable data
      merged.push({
        id: `wearable-${wearable.start_at}`,
        start_at: wearable.start_at,
        end_at: wearable.end_at,
        duration_minutes: wearable.duration_minutes,
        source: 'wearable',
        wearableData: wearable,
        stages: wearable.stages,
        confidence: wearable.confidence
      })
    }
  }
  
  // Add remaining manual blocks (not merged with wearable)
  for (const manual of manualBlocks) {
    if (!processedManual.has(manual.id)) {
      merged.push({
        id: manual.id,
        start_at: manual.start_at,
        end_at: manual.end_at,
        duration_minutes: manual.duration_minutes,
        source: 'manual',
        manualData: manual,
        confidence: 80 // Manual entry confidence
      })
    }
  }
  
  // Sort by start time
  merged.sort((a, b) => 
    new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )
  
  return merged
}

/**
 * Check if two sleep blocks overlap
 */
function blocksOverlap(
  block1: { start_at: string; end_at: string },
  block2: { start_at: string; end_at: string }
): boolean {
  const start1 = new Date(block1.start_at).getTime()
  const end1 = new Date(block1.end_at).getTime()
  const start2 = new Date(block2.start_at).getTime()
  const end2 = new Date(block2.end_at).getTime()
  
  return !(end1 <= start2 || end2 <= start1)
}

/**
 * Remove duplicate sleep blocks
 * Blocks within 30 minutes of each other are considered duplicates
 */
export function removeDuplicates(
  blocks: MergedSleepBlock[],
  thresholdMinutes: number = 30
): MergedSleepBlock[] {
  const unique: MergedSleepBlock[] = []
  
  for (const block of blocks) {
    const isDuplicate = unique.some(existing => {
      const blockStart = new Date(block.start_at).getTime()
      const existingStart = new Date(existing.start_at).getTime()
      const diffMinutes = Math.abs((blockStart - existingStart) / (1000 * 60))
      return diffMinutes <= thresholdMinutes
    })
    
    if (!isDuplicate) {
      unique.push(block)
    }
  }
  
  return unique
}

