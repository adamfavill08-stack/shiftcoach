'use client'

import { useEffect, useMemo, useState } from 'react'

type TrialState = {
  status: 'hidden' | 'loading' | 'visible'
  daysLeft: number
}

export function TrialDaysBanner() {
  const [trial, setTrial] = useState<TrialState>({ status: 'loading', daysLeft: 0 })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store', credentials: 'include' })
        if (!res.ok || !active) {
          setTrial({ status: 'hidden', daysLeft: 0 })
          return
        }
        const json = (await res.json().catch(() => ({}))) as {
          profile?: { subscription_status?: string | null; trial_ends_at?: string | null }
        }
        const status = json?.profile?.subscription_status ?? null
        const trialEndsAt = json?.profile?.trial_ends_at ?? null
        const trialEndMs = trialEndsAt ? new Date(trialEndsAt).getTime() : NaN
        const msLeft = Number.isFinite(trialEndMs) ? trialEndMs - Date.now() : -1
        const daysLeft = msLeft > 0 ? Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000))) : 0

        if (!active) return
        if (status === 'trialing' && daysLeft > 0) {
          setTrial({ status: 'visible', daysLeft })
        } else {
          setTrial({ status: 'hidden', daysLeft: 0 })
        }
      } catch {
        if (active) setTrial({ status: 'hidden', daysLeft: 0 })
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const label = useMemo(() => {
    if (trial.daysLeft <= 0) return ''
    if (trial.daysLeft === 1) return '1 day left in your free trial'
    return `${trial.daysLeft} days left in your free trial`
  }, [trial.daysLeft])

  if (trial.status !== 'visible') return null

  return (
    <div className="mx-4 mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900" role="status" aria-live="polite">
      <span className="font-semibold">Trial active:</span> {label}
    </div>
  )
}

