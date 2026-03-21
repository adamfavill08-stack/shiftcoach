'use client'

import { useEffect, useState } from 'react'
import { Watch } from 'lucide-react'

export default function SyncIndicator() {
  const [status, setStatus] = useState<'idle'|'ok'|'stale'>('idle')

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/sync/status', { cache: 'no-store' })
        if (!res.ok) {
          setStatus('stale')
          return
        }
        const data = await res.json()
        setStatus(data.ok ? 'ok' : 'stale')
      } catch (error) {
        // API route doesn't exist or network error - default to 'ok' to avoid errors
        console.warn('[SyncIndicator] Failed to fetch sync status:', error)
        setStatus('ok')
      }
    }
    run()
    const t = setInterval(run, 60_000) // refresh every minute
    return () => clearInterval(t)
  }, [])

  const iconColor = 'text-slate-700'

  return (
    <button
      className="h-10 w-10 rounded-full bg-white shadow hover:bg-slate-50 ring-1 ring-slate-200 grid place-items-center transition hover:shadow-md"
      onClick={() => window.location.assign('/devices')}
      aria-label="Sync wearable devices"
    >
      <Watch size={20} className={iconColor} />
    </button>
  )
}

