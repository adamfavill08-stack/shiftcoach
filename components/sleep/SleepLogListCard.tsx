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
    <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
      {/* Premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">
              Sleep Log
            </p>
            <h2 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900">
              Recent Sleep Sessions
            </h2>
          </div>
          <button
            onClick={() => router.push('/sleep/logs')}
            className="group relative flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-slate-700 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
          >
            <Calendar className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>View Logs</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="py-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100/80 mb-3">
              <Clock className="h-6 w-6 text-slate-400" strokeWidth={2} />
            </div>
            <p className="text-[13px] font-medium text-slate-600 mb-1">No sleep logged yet</p>
            <p className="text-[11px] text-slate-500">Start logging your sleep to see it here</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 py-3.5 transition-all duration-200 hover:shadow-md hover:border-slate-300/80"
              >
                {/* Subtle gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10 flex items-center justify-between">
                  {/* Left: Type indicator and times */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Type indicator dot */}
                    <div className={`
                      flex-shrink-0 h-2.5 w-2.5 rounded-full
                      ${log.type === 'sleep' 
                        ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' 
                        : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                      }
                    `} />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`
                          text-[12px] font-bold uppercase tracking-wide
                          ${log.type === 'sleep' ? 'text-blue-600' : 'text-amber-600'}
                        `}>
                          {log.type === 'sleep' ? 'Main Sleep' : 'Nap'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatDate(log.start_at)}
                        </span>
                        {log.shift_label && log.shift_label !== 'OFF' && (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-full">
                            {log.shift_label}
                          </span>
                        )}
                        {(!log.shift_label || log.shift_label === 'OFF') && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50/80 px-2 py-0.5 rounded-full">
                            OFF
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                        <span className="font-medium">
                          {formatTime(log.start_at)} → {formatTime(log.end_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Duration */}
                  <div className="flex-shrink-0 ml-4 text-right">
                    <div className="text-[15px] font-bold text-slate-900">
                      {formatDuration(log.durationHours)}
                    </div>
                    {log.quality && (
                      <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                        {log.quality}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All Link */}
        {recentLogs.length > 0 && (
          <button
            onClick={() => router.push('/sleep/logs')}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[12px] font-semibold text-slate-700 bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/60 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>View All Sleep Logs</span>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </section>
  )
}

