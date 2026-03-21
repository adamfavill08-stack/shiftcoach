// Minimal shared type to start with.
// You can extend this as you add more shared domain models.

export interface WearableSample {
  userId: string
  source: 'google_fit' | 'samsung_health' | 'apple_health' | 'other'
  steps: number
  heartRateBpm?: number
  recordedAt: string // ISO timestamp
}

