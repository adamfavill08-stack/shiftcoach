'use client'

import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { isoLocalDate } from '@/lib/shifts'
import { useLanguage } from '@/components/providers/language-provider'
import { intlLocaleForApp } from '@/lib/i18n/supportedLocales'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { supabase } from '@/lib/supabase'

/** Matches `/api/rota/month` cells: `label` is often a slot char (M/A/D/N/O); `type` is set when shifts merge. */
type RotaDay = {
  date: string
  label: string | null
  type?: string | null
  status?: string | null
}

// Interpret raw DB label into a simple shift kind
type SimpleKind = 'day' | 'night' | 'off' | 'other'

function classifyLabel(label: string | null): SimpleKind {
  if (!label) return 'off'
  const upper = label.toUpperCase()

  // Rota month API uses single-letter slots from patterns / merged shifts
  if (upper === 'M' || upper.includes('MORNING')) return 'day'
  if (upper === 'A' || upper.includes('AFTERNOON')) return 'day'
  if (upper === 'D' || upper === 'DAY' || (upper.includes('DAY') && !upper.includes('NIGHT'))) {
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

/** Prefer structured `type` from rota API, then slot / text `label`. */
function classifyShiftKind(label: string | null, type: string | null | undefined): SimpleKind {
  const t = (type ?? '').toLowerCase()
  if (t === 'night') return 'night'
  if (t === 'off') return 'off'
  if (t === 'morning' || t === 'afternoon' || t === 'day') return 'day'
  return classifyLabel(label)
}

// Colour mapping for rota rings to match shift colours on the calendar.
// DAY = blue, NIGHT = red, OFF = light/white, others stay accent colours.
function getBorderColor(label: string | null, status: string | null, type?: string | null): string {
  const kind = classifyShiftKind(label, type)

  if (status === 'SICK') return 'border-red-500'
  if (status === 'ANNUAL_LEAVE') return 'border-teal-500'
  if (status === 'OVERTIME') return 'border-orange-500'
  
  switch (kind) {
    case 'day':
      return 'border-sky-500 dark:border-sky-400' // visible on dark dashboard
    case 'night':
      return 'border-red-500 dark:border-red-400'
    case 'off':
      return 'border-slate-400 dark:border-slate-500'
    default:
      return 'border-slate-500 dark:border-slate-400'
  }
}

// Get text colour for contrast
function getTextColor(label: string | null, status: string | null, type?: string | null): string {
  const kind = classifyShiftKind(label, type)

  if (status === 'SICK') return 'text-red-700'
  if (status === 'ANNUAL_LEAVE') return 'text-teal-700'
  if (status === 'OVERTIME') return 'text-orange-700'
  
  switch (kind) {
    case 'day':
      return 'text-sky-600 dark:text-sky-400'
    case 'night':
      return 'text-red-600 dark:text-red-400'
    case 'off':
      return 'text-slate-500 dark:text-slate-400'
    default:
      return 'text-slate-600 dark:text-slate-400'
  }
}

// Background fill colour for selected state (with opacity)
function getFillColor(label: string | null, status: string | null, type?: string | null): string {
  const kind = classifyShiftKind(label, type)

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
  const { language } = useLanguage()
  const intlLocale = useMemo(() => intlLocaleForApp(language), [language])
  const today = useMemo(() => new Date(), [])
  const [rotaDays, setRotaDays] = useState<RotaDay[]>([])
  /** Bumped when auth hydrates so we refetch after session exists (common on Capacitor after AAB cold start). */
  const [rotaLoadKey, setRotaLoadKey] = useState(0)

  // Today + next 6 days
  const days = useMemo(() => {
    const out: { iso: string; label: string; dayNum: number }[] = []
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push({
        iso: isoLocal(d),
        label: d.toLocaleDateString(intlLocale, { weekday: 'narrow' }).toUpperCase(),
        dayNum: d.getDate(),
      })
    }
    return out
  }, [today, intlLocale])

  // Load rota data for this week via the same month API the calendar uses,
  // so colours always match what the user sees there (pattern + saved shifts).
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const todayDate = new Date()
        const month = todayDate.getMonth() + 1
        const year = todayDate.getFullYear()

        const res = await authedFetch(`/api/rota/month?month=${month}&year=${year}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          if (!cancelled) setRotaDays([])
          return
        }
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
                  type: (day.type as string | null) ?? null,
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
  }, [days, rotaLoadKey])

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
          const label = rota?.label != null ? String(rota.label) : null
          const shiftType = rota?.type ?? null
          const status = rota?.status ?? null
          const isToday = d.iso === todayISO
          const isSelected = selectedDate ? d.iso === selectedDate : isToday

          const borderColor = getBorderColor(label, status, shiftType)
          const textColor = getTextColor(label, status, shiftType)
          const fillColor = getFillColor(label, status, shiftType)

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
                  'text-[11px] text-slate-600 dark:text-slate-400',
                  isToday && 'font-semibold text-slate-900 dark:text-slate-100'
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
