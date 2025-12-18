'use client'

import { Pencil, Trash2, Clock } from 'lucide-react'
import { classifySleep, getClassificationColor } from '@/lib/sleep/classifySleep'

interface SleepSession {
  id: string
  start_at: string
  end_at: string
  type: 'sleep' | 'nap'
  durationHours: number
  quality?: string | number | null
}

type SleepSessionListProps = {
  sessions: SleepSession[]
  onEdit?: (session: SleepSession) => void
  onDelete?: (sessionId: string) => void
  loading?: boolean
}

export function SleepSessionList({
  sessions,
  onEdit,
  onDelete,
  loading = false,
}: SleepSessionListProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0 && m === 0) return '0h'
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500">Loading sleep sessions...</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500">No sleep sessions logged for this day.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const classification = classifySleep({
          start_at: session.start_at,
          end_at: session.end_at,
          durationHours: session.durationHours,
        })
        
        const colorClass = getClassificationColor(classification.classification)
        
        return (
          <div
            key={session.id}
            className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 py-3.5"
          >
            {/* Gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 to-white/85" />
            
            {/* Inner glow */}
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/60" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
                  <span className="text-[13px] font-semibold text-slate-900">
                    {classification.displayLabel}
                  </span>
                </div>
                
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(session)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50/80 border border-blue-200/60 text-blue-600 hover:bg-blue-100/80 transition-all hover:scale-105 active:scale-95"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(session.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50/80 border border-rose-200/60 text-rose-600 hover:bg-rose-100/80 transition-all hover:scale-105 active:scale-95"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-[12px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatTime(session.start_at)} - {formatTime(session.end_at)}</span>
                </div>
                <span className="font-semibold">{formatDuration(session.durationHours)}</span>
                {session.quality && (
                  <span className="text-slate-500">
                    Quality: {typeof session.quality === 'number' ? session.quality : session.quality}
                  </span>
                )}
              </div>
              
              {classification.reasoning && (
                <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                  {classification.reasoning}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

