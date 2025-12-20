'use client'

import { useEffect, useMemo, useState } from 'react'

type SyncState = 'idle' | 'syncing' | 'synced' | 'error'

const FRESH_MS = 6 * 60 * 60 * 1000 // 6h

export default function SyncWearableButton() {
  const [state, setState] = useState<SyncState>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)

  useEffect(() => {
    const ts = localStorage.getItem('wearables:lastSyncedAt')
    if (ts) {
      const n = Number(ts)
      setLastSyncedAt(n)
      if (Date.now() - n < FRESH_MS) setState('synced')
    }
  }, [])

  const label = useMemo(() => {
    switch (state) {
      case 'syncing': return 'Syncing…'
      case 'synced':  return 'Wearables synced'
      case 'error':   return 'Sync failed'
      default:        return 'Sync wearables'
    }
  }, [state])

  async function handleClick() {
    try {
      setState('syncing')
      const res = await fetch('/api/wearables/sync', { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      // Check if user needs to connect Google Fit first
      if (data.error === 'no_google_fit_connection') {
        // Redirect to Google Fit OAuth
        window.location.href = '/api/google-fit/auth'
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      const { lastSyncedAt: serverTs } = data
      const ts = serverTs ? new Date(serverTs).getTime() : Date.now()
      localStorage.setItem('wearables:lastSyncedAt', String(ts))
      setLastSyncedAt(ts)

      // Broadcast sync event so other components can update their labels
      try {
        window.dispatchEvent(new CustomEvent('wearables-synced', { detail: { ts } }))
      } catch {
        // ignore if window is not available
      }

      setState('synced')
      // fall back to idle after 6h
      setTimeout(() => setState('idle'), FRESH_MS)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 5000)
    }
  }

  const dotClassMap: Record<SyncState, string> = {
    idle:   'bg-slate-300',
    syncing:'bg-blue-500 animate-pulse',
    synced: 'bg-emerald-500',
    error:  'bg-rose-500',
  }
  const dotClass = dotClassMap[state]

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      title={label}
      className="relative flex items-center justify-center h-10 w-10 rounded-full bg-white/60 border border-slate-200/50 shadow-none hover:bg-white/85 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 focus-visible:ring-offset-2"
    >
      {/* Cloud-sync glyph (simple) */}
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 18a4 4 0 1 1 .6-7.96A5 5 0 0 1 19 10a3 3 0 0 1 0 6h-1.5" />
        <path d="M13 12l-3 3 3 3v-2h5v-2h-5v-2z" />
      </svg>

      {/* status dot */}
      <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${dotClass} ring-2 ring-white`} />
    </button>
  )
}

