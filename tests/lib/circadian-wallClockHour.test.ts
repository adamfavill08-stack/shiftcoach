import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import {
  LOCAL_HOUR_QUERY,
  parseLocalHourQuery,
  resolveWallHourDecimal,
  getBrowserLocalWallHourDecimal,
  circadianCalculateUrlWithLocalHour,
} from '@/lib/circadian/wallClockHour'

describe('wallClockHour', () => {
  it('parseLocalHourQuery returns null when missing', () => {
    const req = new NextRequest('http://localhost/api/circadian/calculate')
    expect(parseLocalHourQuery(req)).toBeNull()
  })

  it('parseLocalHourQuery reads decimal hour', () => {
    const req = new NextRequest(
      `http://localhost/api/circadian/calculate?${LOCAL_HOUR_QUERY}=2.583333`,
    )
    expect(parseLocalHourQuery(req)).toBeCloseTo(2.583333, 5)
  })

  it('resolveWallHourDecimal prefers query over fallback', () => {
    const req = new NextRequest(
      `http://localhost/api/circadian/calculate?${LOCAL_HOUR_QUERY}=14.25`,
    )
    const fallback = new Date('2020-01-01T03:00:00.000Z')
    expect(resolveWallHourDecimal(req, fallback)).toBeCloseTo(14.25, 5)
  })

  it('resolveWallHourDecimal uses fallback when query absent', () => {
    const req = new NextRequest('http://localhost/api/circadian/calculate')
    const d = new Date(2020, 5, 1, 9, 30, 0)
    expect(resolveWallHourDecimal(req, d)).toBeCloseTo(9.5, 5)
  })

  it('getBrowserLocalWallHourDecimal matches date parts', () => {
    const d = new Date(2018, 2, 4, 7, 15, 0)
    expect(getBrowserLocalWallHourDecimal(d)).toBeCloseTo(7.25, 5)
  })

  it('circadianCalculateUrlWithLocalHour appends query', () => {
    const url = circadianCalculateUrlWithLocalHour('/api/circadian/calculate')
    expect(url.startsWith('/api/circadian/calculate?')).toBe(true)
    expect(url).toContain(`${LOCAL_HOUR_QUERY}=`)
  })
})
