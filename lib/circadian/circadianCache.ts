// Simple in-memory cache for circadian data within a single page session
// Prevents duplicate API calls when multiple components need the same data

import { circadianCalculateUrlWithLocalHour } from '@/lib/circadian/wallClockHour'

export type CircadianDataFetch = {
  circadian: any | null
  status?: string
  reason?: string
}

interface CachedResult {
  data: any
  fetchedAt: number
}

let cache: CachedResult | null = null
const CACHE_TTL_MS = 60_000 // 1 minute

export async function getCircadianData(accessToken: string): Promise<CircadianDataFetch> {
  const now = Date.now()

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { circadian: cache.data, status: 'ok' }
  }

  const res = await fetch(circadianCalculateUrlWithLocalHour('/api/circadian/calculate'), {
    cache: 'no-store',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const json = await res.json().catch(() => ({} as Record<string, unknown>))

  if (!res.ok) {
    return {
      circadian: null,
      reason: String((json as any)?.reason ?? (json as any)?.error ?? `Request failed (${res.status})`),
      status: String((json as any)?.status ?? 'error'),
    }
  }

  if (json.status === 'ok' && json.circadian) {
    cache = { data: json.circadian, fetchedAt: now }
    return { circadian: json.circadian, status: 'ok' }
  }

  return {
    circadian: null,
    reason: String((json as any)?.reason ?? (json as any)?.error ?? 'No data available'),
    status: typeof (json as any)?.status === 'string' ? (json as any).status : undefined,
  }
}

export function clearCircadianCache() {
  cache = null
}
