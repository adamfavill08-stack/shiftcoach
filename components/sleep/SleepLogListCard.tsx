'use client'

import { useState, useEffect } from 'react'
import { Clock, ChevronRight, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

type SleepLogEntry = {
  id: string
  start_at: string
  end_at: string
  type: 'sleep' | 'nap'
  durationHours: number
  quality?: string | null
  shift_label?: string | null
}

export function SleepLogListCard() {
  const [recentLogs, setRecentLogs] = useState<SleepLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        setLoading(true)
        // Fetch last 30 days, then take first 5
        const res = await fetch('/api/sleep/history', { cache: 'no-store' })
        
        if (!res.ok) {
          console.error('[SleepLogListCard] Failed to fetch logs:', res.status)
          setRecentLogs([])
          return
        }

        const data = await res.json()
        const items = data.items || []
        
        // Take only the first 5 most recent logs
        const recentItems = items.slice(0, 5)
        
        // Map to SleepLogEntry format
        const logs: SleepLogEntry[] = recentItems.map((item: any) => {
          const startTime = item.start_at || item.start_ts
          const endTime = item.end_at || item.end_ts
          
          if (!startTime || !endTime) return null
          
          const start = new Date(startTime)
          const end = new Date(endTime)
          const durationMs = end.getTime() - start.getTime()
          const durationHours = durationMs / (1000 * 60 * 60)
          
          // Determine type from old schema (naps) or new schema (type)
          const sessionType: 'sleep' | 'nap' = item.type || (item.naps === 0 || !item.naps ? 'sleep' : 'nap')
          
          return {
            id: item.id,
            start_at: startTime,
            end_at: endTime,
            type: sessionType,
            durationHours,
            quality: item.quality,
            shift_label: item.shift_label || null,
          }
        }).filter((log: any) => log !== null)
        
        setRecentLogs(logs)
      } catch (err) {
        console.error('[SleepLogListCard] Error fetching logs:', err)
        setRecentLogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecentLogs()

    // Listen for sleep refresh events
    const handleRefresh = () => {
      fetchRecentLogs()
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [])

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0 && m === 0) return '0h'
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white/75 backdrop-blur-xl border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] p-6">
      {/* Top highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 via-transparent to-transparent" />
      
      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">
              SLEEP LOG
            </p>
            <h3 className="mt-2 text-[18px] font-semibold tracking-tight text-slate-900">
              Recent Sleep Sessions
            </h3>
          </div>
          <button
            onClick={() => router.push('/sleep/logs')}
            className="group flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-slate-700 bg-white/70 backdrop-blur border border-slate-200/60 hover:bg-white/90 transition-colors shadow-[0_8px_20px_-14px_rgba(0,0,0,0.18)]"
          >
            <Calendar className="h-4 w-4 text-slate-400" strokeWidth={2} />
            <span>View Logs</span>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition" strokeWidth={2} />
          </button>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="py-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50/60 border border-slate-200/50 mb-3">
              <Clock className="h-5 w-5 text-slate-400" strokeWidth={2} />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">No sleep logged yet</p>
            <p className="text-sm text-slate-600 leading-relaxed">Start logging your sleep to see it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 hover:bg-white/70 transition-colors"
              >
                {/* Left: Type indicator and times */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Type indicator dot */}
                  <div className={`
                    flex-shrink-0 h-2 w-2 rounded-full
                    ${log.type === 'sleep' 
                      ? 'bg-blue-500/80' 
                      : 'bg-amber-500/80'
                    }
                  `} />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`
                        text-xs font-semibold uppercase tracking-wide
                        ${log.type === 'sleep' ? 'text-blue-600' : 'text-amber-600'}
                      `}>
                        {log.type === 'sleep' ? 'Main Sleep' : 'Nap'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(log.start_at)}
                      </span>
                      {log.shift_label && log.shift_label !== 'OFF' && (
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-100/60 border border-slate-200/50 px-2 py-0.5 rounded-full">
                          {log.shift_label}
                        </span>
                      )}
                      {(!log.shift_label || log.shift_label === 'OFF') && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-50/60 border border-slate-200/50 px-2 py-0.5 rounded-full">
                          OFF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                      <span className="font-medium tabular-nums">
                        {formatTime(log.start_at)} → {formatTime(log.end_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Duration */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatDuration(log.durationHours)}
                  </div>
                  {log.quality && (
                    <div className="text-xs text-slate-500 mt-0.5 capitalize">
                      {log.quality}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All Link */}
        {recentLogs.length > 0 && (
          <button
            onClick={() => router.push('/sleep/logs')}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50/60 hover:bg-slate-100/60 border border-slate-200/50 transition-colors"
          >
            <span>View All Sleep Logs</span>
            <ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={2} />
          </button>
        )}
      </div>
    </section>
  )
}

