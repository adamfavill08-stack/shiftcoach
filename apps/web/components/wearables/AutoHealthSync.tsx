"use client"

import { useEffect } from 'react'

const FRESH_MS = 6 * 60 * 60 * 1000 // 6h, same idea as SyncWearableButton

export function AutoHealthSync() {
  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        if (typeof window === 'undefined') return

        const last = window.localStorage.getItem('health:autoSync:lastTs')
        if (last) {
          const ts = Number(last)
          if (!Number.isNaN(ts) && Date.now() - ts < FRESH_MS) {
            return
          }
        }

        const res = await fetch('/api/wearables/sync', { method: 'POST' }).catch(() => null)
        if (!res || cancelled) return

        const data = await res.json().catch(() => ({} as any))
        if (!res.ok || data?.error) {
          return
        }

        if (!cancelled) {
          window.localStorage.setItem('health:autoSync:lastTs', String(Date.now()))
        }
      } catch {
        // Swallow errors – auto‑sync should never break the app
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}

