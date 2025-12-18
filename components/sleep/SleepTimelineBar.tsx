'use client'

import { Clock } from 'lucide-react'
import { classifySleep, getClassificationColor, type SleepClassification } from '@/lib/sleep/classifySleep'

interface SleepSession {
  id: string
  start_at: string
  end_at: string
  type: 'sleep' | 'nap'
  durationHours: number
}

type SleepTimelineBarProps = {
  sessions: SleepSession[]
  onSessionClick?: (session: SleepSession) => void
  shiftedDayStart: string // ISO string
  shiftedDayEnd: string // ISO string
}

export function SleepTimelineBar({
  sessions,
  onSessionClick,
  shiftedDayStart,
  shiftedDayEnd,
}: SleepTimelineBarProps) {
  const dayStart = new Date(shiftedDayStart)
  const dayEnd = new Date(shiftedDayEnd)
  const dayDuration = dayEnd.getTime() - dayStart.getTime()
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  
  return (
    <div className="relative">
      {/* Timeline background */}
      <div className="relative h-16 rounded-xl bg-slate-100/60 border border-slate-200/60 overflow-hidden">
        {/* Hour markers */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 25 }).map((_, i) => {
            const hour = (dayStart.getHours() + i) % 24
            const position = (i / 24) * 100
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-slate-300/40"
                style={{ left: `${position}%` }}
              >
                {hour % 6 === 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-medium">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Sleep blocks */}
        {sessions.map((session) => {
          const start = new Date(session.start_at)
          const end = new Date(session.end_at)
          
          // Calculate position and width
          const startOffset = (start.getTime() - dayStart.getTime()) / dayDuration
          const sessionDuration = (end.getTime() - start.getTime()) / dayDuration
          
          const left = Math.max(0, Math.min(100, startOffset * 100))
          const width = Math.max(2, Math.min(100 - left, sessionDuration * 100))
          
          // Classify sleep
          const classification = classifySleep({
            start_at: session.start_at,
            end_at: session.end_at,
            durationHours: session.durationHours,
          })
          
          const colorClass = getClassificationColor(classification.classification)
          
          return (
            <button
              key={session.id}
              onClick={() => onSessionClick?.(session)}
              className={`
                absolute top-2 bottom-2 rounded-lg
                ${colorClass}
                shadow-md
                transition-all duration-200
                hover:scale-105 hover:shadow-lg
                active:scale-95
                flex items-center justify-center
                group
              `}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                minWidth: '40px',
              }}
              title={`${classification.displayLabel}: ${formatTime(start)} - ${formatTime(end)}`}
            >
              <div className="px-2 py-1 bg-white/20 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] font-bold text-white whitespace-nowrap">
                  {formatTime(start)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
      
      {/* Legend */}
      {sessions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-600">
          <span className="font-medium">Today:</span>
          {sessions.map((session) => {
            const classification = classifySleep({
              start_at: session.start_at,
              end_at: session.end_at,
              durationHours: session.durationHours,
            })
            return (
              <span
                key={session.id}
                className="inline-flex items-center gap-1"
              >
                <span className={`w-2 h-2 rounded ${getClassificationColor(classification.classification)}`} />
                {classification.displayLabel}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

