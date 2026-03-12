'use client'

import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { isoLocalDate } from '@/lib/shifts'

type RotaDay = { date: string; label: string | null; status?: string | null }

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Interpret raw DB label into a simple shift kind
type SimpleKind = 'day' | 'night' | 'off' | 'other'

function classifyLabel(label: string | null): SimpleKind {
  if (!label) return 'off'
  const upper = label.toUpperCase()

  if (upper === 'D' || upper === 'DAY' || upper.includes('DAY') && !upper.includes('NIGHT')) {
    return 'day'
  }
  if (upper === 'N' || upper === 'NIGHT' || upper.includes('NIGHT')) {
    return 'night'
  }
  if (upper === 'O' || upper === 'OFF' || upper.includes('OFF')) {
    return 'off'
  }
  return 'other'
}

// Colour mapping for rota rings to match shift colours on the calendar.
// DAY = blue, NIGHT = red, OFF = light/white, others stay accent colours.
function getBorderColor(label: string | null, status: string | null): string {
  const kind = classifyLabel(label)

  if (status === 'SICK') return 'border-red-500'
  if (status === 'ANNUAL_LEAVE') return 'border-teal-500'
  if (status === 'OVERTIME') return 'border-orange-500'
  
  switch (kind) {
    case 'day': return 'border-sky-500'    // blue ring for day shifts
    case 'night': return 'border-red-500'  // red ring for night shifts
    case 'off': return 'border-slate-200'  // light / white‑ish ring for days off
    default: return 'border-slate-300'
  }
}

// Get text colour for contrast
function getTextColor(label: string | null, status: string | null): string {
  const kind = classifyLabel(label)

  if (status === 'SICK') return 'text-red-700'
  if (status === 'ANNUAL_LEAVE') return 'text-teal-700'
  if (status === 'OVERTIME') return 'text-orange-700'
  
  switch (kind) {
    case 'day': return 'text-sky-500'
    case 'night': return 'text-red-500'
    case 'off': return 'text-slate-400'
    default: return 'text-slate-500'
  }
}

// Background fill colour for selected state (with opacity)
function getFillColor(label: string | null, status: string | null): string {
  const kind = classifyLabel(label)

  if (status === 'SICK') return 'bg-red-500/10'
  if (status === 'ANNUAL_LEAVE') return 'bg-teal-500/10'
  if (status === 'OVERTIME') return 'bg-orange-500/10'
  
  switch (kind) {
    case 'day': return 'bg-sky-500/10'
    case 'night': return 'bg-red-500/10'
    case 'off': return 'bg-slate-200/20'
    default: return 'bg-slate-300/10'
  }
}

// Helper to get YYYY-MM-DD in local time (same as rota calendar)
function isoLocal(d: Date) {
  return isoLocalDate(d)
}

export function ShiftWeekStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate?: string
  onSelect?: (isoDate: string) => void
}) {
  const today = useMemo(() => new Date(), [])
  const [rotaDays, setRotaDays] = useState<RotaDay[]>([])

  // Today + next 6 days
  const days = useMemo(() => {
    const out: { iso: string; label: string; dayNum: number }[] = []
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push({
        iso: isoLocal(d),
        label: DAY_LABELS[d.getDay()],
        dayNum: d.getDate(),
      })
    }
    return out
  }, [today])

  // Load rota data for this week via the same month API the calendar uses,
  // so colours always match what the user sees there (pattern + saved shifts).
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const todayDate = new Date()
        const month = todayDate.getMonth() + 1
        const year = todayDate.getFullYear()

        const res = await fetch(`/api/rota/month?month=${month}&year=${year}`, {
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))

        if (
          !cancelled &&
          data &&
          Array.isArray(data.weeks)
        ) {
          const flat: RotaDay[] = []
          for (const week of data.weeks as any[]) {
            if (!Array.isArray(week)) continue
            for (const day of week) {
              if (day && typeof day.date === 'string') {
                flat.push({
                  date: day.date,
                  label: (day.label as string | null) ?? null,
                  status: (day.status as string | null) ?? null,
                })
              }
            }
          }
          setRotaDays(flat)
        }
      } catch {
        // fail silently – strip will just show OFF colours
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [days])

  // Map date -> rota entry
  const byDate = useMemo(() => {
    const map = new Map<string, RotaDay>()
    rotaDays.forEach((d) => {
      if (d.date) map.set(d.date, d)
    })
    return map
  }, [rotaDays])

  const todayISO = isoLocal(today)

  return (
    <div className="w-full mb-2">
      <div className="flex justify-around items-center mt-2 mb-1">
        {days.map((d) => {
          const rota = byDate.get(d.iso)
          const label = rota?.label || null
          const status = rota?.status ?? null
          const isToday = d.iso === todayISO
          const isSelected = selectedDate ? d.iso === selectedDate : isToday

          const borderColor = getBorderColor(label, status)
          const textColor = getTextColor(label, status)
          const fillColor = getFillColor(label, status)

          return (
            <button
              key={d.iso}
              onClick={() => onSelect?.(d.iso)}
              className="flex flex-col items-center gap-1 text-xs"
            >
              <div
                className={clsx(
                  'flex items-center justify-center h-8 w-8 rounded-full bg-transparent border-2',
                  borderColor,
                  isSelected && fillColor
                )}
              >
                <span className={clsx('font-semibold', textColor)}>{d.label}</span>
              </div>

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
