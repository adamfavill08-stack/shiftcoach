import type { SleepQuality, SleepType } from '@/lib/sleep/types'

type SleepTypeAlias = SleepType | 'sleep' | 'main' | 'post_shift' | 'recovery' | 'pre_shift_nap'
type QualityAlias = SleepQuality | 'Excellent' | 'Good' | 'Fair' | 'Poor' | string | number | null | undefined

export function normalizeSleepType(type: SleepTypeAlias | string | null | undefined): SleepType | null {
  const raw = type == null ? '' : String(type).trim()
  if (!raw) return 'main_sleep'

  switch (raw) {
    case 'nap':
    case 'pre_shift_nap':
      return 'nap'
    case 'post_shift_sleep':
    case 'post_shift':
      return 'post_shift_sleep'
    case 'recovery_sleep':
    case 'recovery':
      return 'recovery_sleep'
    case 'sleep':
    case 'main':
    case 'main_sleep':
      return 'main_sleep'
    default:
      return null
  }
}

export function normalizeSleepQuality(value: QualityAlias): SleepQuality | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.min(5, Math.round(value))) as SleepQuality
  }
  const label = String(value).trim().toLowerCase()
  if (!label) return null
  if (label === 'excellent') return 5
  if (label === 'good') return 4
  if (label === 'fair') return 3
  if (label === 'poor') return 2
  if (label === 'very poor' || label === 'very_poor') return 1
  const numeric = Number(label)
  if (Number.isFinite(numeric)) {
    return Math.max(1, Math.min(5, Math.round(numeric))) as SleepQuality
  }
  return null
}

export function normalizeIanaTimeZone(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const zone = raw.slice(0, 120)
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone })
    return zone
  } catch {
    return null
  }
}
