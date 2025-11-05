'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { labelColor, type Shift } from '@/lib/shifts'
import clsx from 'clsx'

type Row = { date: string; label: Shift['label'] | null; status: Shift['status'] | null }

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Extract border color from labelColor result for circle border
function getBorderColor(label: Shift['label'] | null, status: Shift['status'] | null): string {
  const colorClass = labelColor(label || 'OFF', status || 'PLANNED')
  
  // Extract border color from the className
  // labelColor returns: "bg-yellow-100 text-yellow-700 border-yellow-200"
  // We need: "border-yellow-500" (darker for the circle ring)
  if (status === 'SICK') return 'border-red-500'
  if (status === 'ANNUAL_LEAVE') return 'border-teal-500'
  if (status === 'OVERTIME') return 'border-orange-500'
  
  switch (label) {
    case 'DAY': return 'border-yellow-500'
    case 'NIGHT': return 'border-indigo-500'
    case 'OFF': return 'border-slate-300'
    case 'ONCALL': return 'border-purple-500'
    default: return 'border-slate-300'
  }
}

// Get stroke color for SVG progress ring (hex format)
function getStrokeColor(label: Shift['label'] | null, status: Shift['status'] | null): string {
  if (status === 'SICK') return '#ef4444' // red-500
  if (status === 'ANNUAL_LEAVE') return '#14b8a6' // teal-500
  if (status === 'OVERTIME') return '#f97316' // orange-500
  
  switch (label) {
    case 'DAY': return '#eab308' // yellow-500
    case 'NIGHT': return '#6366f1' // indigo-500
    case 'OFF': return '#cbd5e1' // slate-300
    case 'ONCALL': return '#a855f7' // purple-500
    default: return '#cbd5e1' // slate-300
  }
}

// Get text color for contrast
function getTextColor(label: Shift['label'] | null, status: Shift['status'] | null): string {
  if (status === 'SICK') return 'text-red-700'
  if (status === 'ANNUAL_LEAVE') return 'text-teal-700'
  if (status === 'OVERTIME') return 'text-orange-700'
  
  switch (label) {
    case 'DAY': return 'text-yellow-700'
    case 'NIGHT': return 'text-indigo-700'
    case 'OFF': return 'text-slate-500'
    case 'ONCALL': return 'text-purple-700'
    default: return 'text-slate-500'
  }
}

// Get background fill color for selected state (with opacity)
function getFillColor(label: Shift['label'] | null, status: Shift['status'] | null): string {
  if (status === 'SICK') return 'bg-red-500/10'
  if (status === 'ANNUAL_LEAVE') return 'bg-teal-500/10'
  if (status === 'OVERTIME') return 'bg-orange-500/10'
  
  switch (label) {
    case 'DAY': return 'bg-yellow-500/10'
    case 'NIGHT': return 'bg-indigo-500/10'
    case 'OFF': return 'bg-slate-300/10'
    case 'ONCALL': return 'bg-purple-500/10'
    default: return 'bg-slate-300/10'
  }
}

// Calculate daily progress (0-1)
function getDailyProgress(): number {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const totalMinutes = hours * 60 + minutes
  const totalMinutesInDay = 24 * 60
  return Math.min(Math.max(totalMinutes / totalMinutesInDay, 0), 1)
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function ShiftWeekStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate?: string
  onSelect?: (isoDate: string) => void
}) {
  const today = useMemo(() => new Date(), [])
  const [rows, setRows] = useState<Row[]>([])
  const [dailyProgress, setDailyProgress] = useState(getDailyProgress())

  // Update progress every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDailyProgress(getDailyProgress())
    }, 60000) // Update every minute

    // Also update immediately on mount
    setDailyProgress(getDailyProgress())

    return () => clearInterval(interval)
  }, [])

  // Today + next 6 days
  const days = useMemo(() => {
    const out: { iso: string; label: string; dayNum: number }[] = []
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + i)
      out.push({
        iso: isoDay(d),
        label: DAY_LABELS[d.getUTCDay()],
        dayNum: d.getUTCDate(),
      })
    }
    return out
  }, [today])

  // Load shifts for those 7 days
  useEffect(() => {
    ;(async () => {
      if (!days.length) return
      const startISO = days[0].iso
      const endISO = days[days.length - 1].iso

      const { data, error } = await supabase
        .from('shifts')
        .select('date, label, status')
        .gte('date', startISO)
        .lte('date', endISO)

      if (!error && data) setRows(data as Row[])
    })()
  }, [days])

  // Map date -> shift data
  const byDate = useMemo(() => {
    const map = new Map<string, Row>()
    rows.forEach((r) => {
      map.set(r.date, r)
    })
    return map
  }, [rows])

  const todayISO = isoDay(today)

  return (
    <div className="w-full mb-2">
      <div className="flex justify-around items-center mt-2 mb-1">
        {days.map((d) => {
          const shift = byDate.get(d.iso)
          const label = shift?.label || null
          const status = shift?.status || null
          const isToday = d.iso === todayISO
          const isSelected = selectedDate ? d.iso === selectedDate : isToday

          const borderColor = getBorderColor(label, status)
          const textColor = getTextColor(label, status)
          const fillColor = getFillColor(label, status)
          const strokeColor = getStrokeColor(label, status)

          // For today's circle, use SVG progress ring
          if (isToday) {
            const radius = 14 // 32px circle / 2 - 2px border = 14px radius
            const circumference = 2 * Math.PI * radius
            const offset = circumference * (1 - dailyProgress)

            return (
              <button
                key={d.iso}
                onClick={() => onSelect?.(d.iso)}
                className="flex flex-col items-center gap-1 text-xs"
              >
                {/* Circle with SVG progress ring for today */}
                <div className="relative h-8 w-8 flex items-center justify-center">
                  <svg
                    className="absolute inset-0 h-8 w-8 -rotate-90"
                    viewBox="0 0 32 32"
                  >
                    {/* Background circle */}
                    <circle
                      cx="16"
                      cy="16"
                      r={radius}
                      fill="transparent"
                      stroke="#e2e8f0"
                      strokeWidth="2"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="16"
                      cy="16"
                      r={radius}
                      fill="transparent"
                      stroke={strokeColor}
                      strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Centered text */}
                  <span className={clsx('relative font-semibold', textColor)}>
                    {d.label}
                  </span>
                  {/* Selected fill overlay */}
                  {isSelected && (
                    <div className={clsx('absolute inset-0 rounded-full', fillColor)} />
                  )}
                </div>

                {/* Number under circle – bold if today */}
                <span
                  className={clsx(
                    'text-[11px] text-slate-600',
                    isToday && 'font-semibold text-slate-900'
                  )}
                >
                  {d.dayNum}
                </span>
              </button>
            )
          }

          // For non-today circles, use regular border
          return (
            <button
              key={d.iso}
              onClick={() => onSelect?.(d.iso)}
              className="flex flex-col items-center gap-1 text-xs"
            >
              {/* Circle with coloured ring */}
              <div
                className={clsx(
                  'flex items-center justify-center h-8 w-8 rounded-full bg-transparent',
                  borderColor,
                  isSelected ? 'border-[2.5px]' : 'border-2',
                  isSelected && fillColor
                )}
              >
                <span className={clsx('font-semibold', textColor)}>{d.label}</span>
              </div>

              {/* Number under circle */}
              <span
                className={clsx(
                  'text-[11px] text-slate-600',
                  isToday && 'font-semibold text-slate-900'
                )}
              >
                {d.dayNum}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
