'use client'

import type { SleepType } from '@/lib/sleep/types'
import { getSleepTypeLabel } from '@/lib/sleep/utils'

interface SleepSession {
  id: string
  start_at: string
  end_at: string
  type: SleepType
  durationHours: number
}

type SleepTimelineBarProps = {
  sessions: SleepSession[]
  onSessionClick?: (session: SleepSession) => void
  shiftedDayStart: string // ISO string
  shiftedDayEnd: string // ISO string
  shiftLabel?: string
}

function getShiftWindowHours(shiftLabel?: string): { startHour: number; endHour: number } | null {
  const shift = (shiftLabel || '').toUpperCase()
  if (shift === 'NIGHT') return { startHour: 22, endHour: 6 }
  if (shift === 'DAY') return { startHour: 8, endHour: 16 }
  if (shift === 'EARLY') return { startHour: 6, endHour: 14 }
  if (shift === 'LATE') return { startHour: 14, endHour: 22 }
  return null
}

function sessionStyle(type: SleepType, isPrimary: boolean) {
  if (type === 'nap') {
    return isPrimary
      ? 'bg-sky-400/85 border border-sky-500/80'
      : 'bg-sky-300/80 border border-sky-400/70'
  }
  if (type === 'post_shift_sleep') {
    return isPrimary
      ? 'bg-indigo-500/90 border border-indigo-600/80'
      : 'bg-indigo-400/85 border border-indigo-500/70'
  }
  if (type === 'recovery_sleep') {
    return isPrimary
      ? 'bg-emerald-500/90 border border-emerald-600/80'
      : 'bg-emerald-400/85 border border-emerald-500/70'
  }
  return isPrimary
    ? 'bg-slate-700/90 border border-slate-800/80'
    : 'bg-slate-500/85 border border-slate-600/70'
}

function buildTimelineSummary(
  sessions: SleepSession[],
  primarySessionId: string | null,
  shiftLabel?: string,
): string | null {
  if (!sessions.length) return null

  const primary = sessions.find((s) => s.id === primarySessionId) ?? null
  const shift = (shiftLabel || '').toUpperCase()
  const blockCount = sessions.length
  const fragmented = blockCount >= 3

  if (primary) {
    const start = new Date(primary.start_at)
    const startHour = start.getHours()

    if (shift === 'NIGHT') {
      if (startHour >= 6 && startHour <= 14) {
        return fragmented
          ? 'Longest sleep occurred after your shift; sleep is split across multiple blocks.'
          : 'Longest sleep occurred after your shift.'
      }
      return fragmented
        ? 'Longest sleep was outside a typical post-shift window; sleep is split across multiple blocks.'
        : 'Longest sleep was outside a typical post-shift window.'
    }

    return fragmented
      ? 'Sleep is split across multiple blocks; longest block is highlighted.'
      : 'Longest sleep block is highlighted for quick review.'
  }

  return blockCount > 1
    ? 'Sleep is split across multiple blocks.'
    : 'Single sleep block logged in this shifted day.'
}

export function SleepTimelineBar({
  sessions,
  onSessionClick,
  shiftedDayStart,
  shiftedDayEnd,
  shiftLabel,
}: SleepTimelineBarProps) {
  const dayStart = new Date(shiftedDayStart)
  const dayEnd = new Date(shiftedDayEnd)
  const dayDuration = dayEnd.getTime() - dayStart.getTime()
  const shiftWindow = getShiftWindowHours(shiftLabel)
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const primarySessionId =
    sessions
      .filter((s) => s.type !== 'nap')
      .sort((a, b) => b.durationHours - a.durationHours)[0]?.id ?? null
  const timelineSummary = buildTimelineSummary(sessions, primarySessionId, shiftLabel)

  const shiftBand = (() => {
    if (!shiftWindow) return null
    const dayStartHour = dayStart.getHours()
    const normalizeHour = (h: number) => {
      let offset = h - dayStartHour
      if (offset < 0) offset += 24
      return offset
    }
    const startOffsetHours = normalizeHour(shiftWindow.startHour)
    const rawEndOffsetHours = normalizeHour(shiftWindow.endHour)
    const endOffsetHours = rawEndOffsetHours <= startOffsetHours ? rawEndOffsetHours + 24 : rawEndOffsetHours
    const left = (startOffsetHours / 24) * 100
    const width = ((endOffsetHours - startOffsetHours) / 24) * 100
    return { left, width, label: shiftLabel?.toUpperCase() ?? '' }
  })()
  
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-4">
        <p className="text-xs text-slate-500">No sleep logged for this shifted day yet.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>Shifted 24h timeline</span>
        {shiftBand ? <span>Shift: {shiftBand.label}</span> : <span>Shift: OFF</span>}
      </div>
      {/* Timeline background */}
      <div className="relative h-16 rounded-xl bg-slate-100/60 border border-slate-200/60 overflow-hidden">
        {/* Shift window overlay */}
        {shiftBand && (
          <div
            className="absolute top-0 bottom-0 rounded-md bg-slate-300/25 border-x border-slate-300/40"
            style={{ left: `${shiftBand.left}%`, width: `${shiftBand.width}%` }}
          />
        )}

        {/* Hour markers (every 4h labels, light grid) */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 25 }).map((_, i) => {
            const hour = (dayStart.getHours() + i) % 24
            const position = (i / 24) * 100
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-slate-300/30"
                style={{ left: `${position}%` }}
              >
                {hour % 4 === 0 && (
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
          
          const isPrimary = session.id === primarySessionId
          const colorClass = sessionStyle(session.type, isPrimary)
          
          return (
            <button
              key={session.id}
              onClick={() => onSessionClick?.(session)}
              type="button"
              className={`
                absolute top-2 bottom-2 rounded-lg
                ${colorClass}
                shadow-sm
                transition-all duration-200
                hover:scale-[1.02] hover:shadow-md
                active:scale-95
                flex items-center justify-center
                group
              `}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                minWidth: '40px',
              }}
              title={`${getSleepTypeLabel(session.type)} - ${formatTime(start)} to ${formatTime(end)} (${session.durationHours.toFixed(1)}h)`}
            >
              <div className="px-1.5 py-0.5 bg-black/20 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[9px] font-semibold text-white whitespace-nowrap">
                  {formatTime(start)} · {session.durationHours.toFixed(1)}h
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
          {sessions.map((session) => (
            <span
              key={session.id}
              className="inline-flex items-center gap-1"
            >
              <span className={`w-2 h-2 rounded ${sessionStyle(session.type, session.id === primarySessionId)}`} />
              {getSleepTypeLabel(session.type)}
            </span>
          ))}
        </div>
      )}
      {timelineSummary && (
        <p className="mt-2 text-[11px] text-slate-500">{timelineSummary}</p>
      )}
    </div>
  )
}

