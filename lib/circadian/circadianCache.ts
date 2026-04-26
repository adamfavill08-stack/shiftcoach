// Simple in-memory cache for circadian data within a single page session
// Prevents duplicate API calls when multiple components need the same data

import { circadianCalculateUrlWithLocalHour } from '@/lib/circadian/wallClockHour'

interface CachedResult {
  data: any
  fetchedAt: number
}

let cache: CachedResult | null = null
const CACHE_TTL_MS = 60_000 // 1 minute

export async function getCircadianData(accessToken: string): Promise<any> {
  const now = Date.now()

  // Return cached result if still fresh
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data
  }

  const res = await fetch(circadianCalculateUrlWithLocalHour("/api/circadian/calculate"), {
    cache: "no-store",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) return null

  const json = await res.json()
  if (json.status === "ok" && json.circadian) {
    cache = { data: json.circadian, fetchedAt: now }
    return json.circadian
  }

  return null
}

export function clearCircadianCache() {
  cache = null
}
