import { describe, expect, it } from 'vitest'
import {
  normalizeIanaTimeZone,
  normalizeSleepQuality,
  normalizeSleepType,
} from '@/lib/sleep/normalizeSleepLogPayload'

describe('normalizeSleepLogPayload', () => {
  it('maps legacy sleep type aliases to canonical values', () => {
    expect(normalizeSleepType('sleep')).toBe('main_sleep')
    expect(normalizeSleepType('main')).toBe('main_sleep')
    expect(normalizeSleepType('post_shift')).toBe('post_shift_sleep')
    expect(normalizeSleepType('recovery')).toBe('recovery_sleep')
    expect(normalizeSleepType('pre_shift_nap')).toBe('nap')
  })

  it('maps string quality labels sent by older sleep sheets', () => {
    expect(normalizeSleepQuality('Excellent')).toBe(5)
    expect(normalizeSleepQuality('Good')).toBe(4)
    expect(normalizeSleepQuality('Fair')).toBe(3)
    expect(normalizeSleepQuality('Poor')).toBe(2)
    expect(normalizeSleepQuality(9)).toBe(5)
  })

  it('rejects unknown sleep types instead of silently treating them as main sleep', () => {
    expect(normalizeSleepType('mistyped_sleep')).toBeNull()
  })

  it('validates client supplied IANA time zones', () => {
    expect(normalizeIanaTimeZone('Europe/London')).toBe('Europe/London')
    expect(normalizeIanaTimeZone('Not/AZone')).toBeNull()
  })
})
