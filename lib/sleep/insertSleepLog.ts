import { isoLocalDate } from '@/lib/shifts'

export type SleepLogInput = {
  start_time: string | Date // ISO string or Date
  end_time: string | Date // ISO string or Date
  quality?: number // 1-5, default 3
  naps?: number // integer, default 0 (0 for main sleep, 1+ for naps)
  notes?: string | null
}

export type SleepLogInsert = {
  user_id: string
  date: string // YYYY-MM-DD
  start_time: string // ISO timestamp (timestamptz)
  end_time: string // ISO timestamp (timestamptz)
  quality: number // 1-5 (integer)
  naps: number // integer, default 0
  // Note: duration_min is calculated automatically by the database from start_time and end_time
  // Note: sleep_hours is a generated column (computed from duration_min), don't include it
  // Note: created_at has default now(), don't include it
}

/**
 * Format and validate sleep log data for Supabase insert
 * Validates all fields - duration_min is calculated automatically by the database
 */
export function formatSleepLogForInsert(
  userId: string,
  input: SleepLogInput
): SleepLogInsert {
  // Convert to Date objects if strings
  const startTime = typeof input.start_time === 'string' 
    ? new Date(input.start_time) 
    : input.start_time
  const endTime = typeof input.end_time === 'string' 
    ? new Date(input.end_time) 
    : input.end_time

  // Validate dates
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new Error('Invalid start_time or end_time')
  }

  // Get date from start_time (YYYY-MM-DD)
  const date = isoLocalDate(startTime)

  // Sanitize quality (1-5, default 3)
  const quality = Math.max(1, Math.min(5, Math.round(input.quality ?? 3)))

  // Sanitize naps (>= 0, default 0)
  // naps: 0 = main sleep, 1+ = number of naps
  const naps = Math.max(0, Math.round(input.naps ?? 0))

  return {
    user_id: userId,
    date,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    quality,
    naps,
    // Note: duration_min is calculated automatically by the database from start_time and end_time
    // Note: sleep_hours is generated from duration_min, don't include it
  }
}

