'use client'

import { useEffect, useState } from 'react'

export type CoachTip = {
  title: string
  body: string
}

export function useCoachTip(score: number) {
  const [tip, setTip] = useState<CoachTip | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function run() {
      try {
        setLoading(true)
        setError(null)

        const url = `/api/coach/tip?score=${encodeURIComponent(score ?? 0)}`
        const res = await fetch(url, { method: 'GET', signal: controller.signal })
        const data = await res.json().catch(() => ({}))

        if (cancelled) return

        if (!res.ok) {
          setError(data?.error ?? `Failed to load coach tip (${res.status})`)
          return
        }

        const content = typeof data.tip === 'string' ? data.tip.trim() : ''
        setTip(content ? { title: 'Coach tip', body: content } : null)
      } catch (err: any) {
        if (cancelled || err?.name === 'AbortError') return
        setError(err?.message ?? 'Network error while loading coach tip')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [score])

  return { tip, loading, error }
}
