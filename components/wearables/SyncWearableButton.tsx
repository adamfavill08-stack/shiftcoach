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
      if (!res.ok) throw new Error(await res.text())

      const { lastSyncedAt: serverTs } = await res.json().catch(() => ({}))
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
      className="relative h-10 w-10 rounded-full bg-white shadow ring-1 ring-slate-200 grid place-items-center active:scale-95 transition"
    >
      {/* Cloud-sync glyph (simple) */}
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 18a4 4 0 1 1 .6-7.96A5 5 0 0 1 19 10a3 3 0 0 1 0 6h-1.5" />
        <path d="M13 12l-3 3 3 3v-2h5v-2h-5v-2z" />
      </svg>

      {/* status dot */}
      <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${dotClass} ring-2 ring-white`} />
    </button>
  )
}

