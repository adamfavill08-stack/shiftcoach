export type SleepType =
  | 'main_sleep'
  | 'post_shift_sleep'
  | 'recovery_sleep'
  | 'nap'

export type SleepSource =
  | 'manual'
  | 'apple_health'
  | 'health_connect'
  | 'fitbit'
  | 'oura'
  | 'garmin'

export type SleepQuality = 1 | 2 | 3 | 4 | 5

export type SleepLogInput = {
  type: SleepType
  startAt: string
  endAt: string
  quality?: SleepQuality | null
  notes?: string
  source?: SleepSource
}

export type SleepLogRow = {
  id: string
  user_id: string
  start_at: string
  end_at: string
  type: SleepType
  source: SleepSource
  quality: SleepQuality | null
  notes: string | null
  external_id: string | null
  timezone: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}
