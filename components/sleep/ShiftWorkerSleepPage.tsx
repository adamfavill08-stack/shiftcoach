'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Clock, Calendar, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { QuickSleepLogButtons } from './QuickSleepLogButtons'
import { SleepTimelineBar } from './SleepTimelineBar'
import { SleepSessionList } from './SleepSessionList'
import { LogSleepModal } from './LogSleepModal'
import { SleepEditModal } from './SleepEditModal'
import { DeleteSleepConfirmModal } from './DeleteSleepConfirmModal'
import type { SleepType } from '@/lib/sleep/predictSleep'

interface SleepSession {
  id: string
  start_at: string
  end_at: string
  type: 'sleep' | 'nap'
  durationHours: number
  quality?: string | number | null
  notes?: string | null
}

interface ShiftedDay {
  date: string
  shiftedDayStart: string
  sessions: SleepSession[]
  totalMinutes: number
  totalHours: number
}

interface SleepHistoryDay {
  date: string
  totalMinutes: number
  shiftLabel: string
}

function SleepMetricsCard({
  targetHours,
  loading,
}: {
  targetHours: number
  loading: boolean
}) {
  return (
    <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Sleep metrics
          </p>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Tonight&apos;s target &amp; weekly overview
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        {/* Tonight's target */}
        <div className="space-y-1">
          <p className="font-semibold tracking-[0.14em] uppercase text-slate-500">
            Tonight&apos;s target
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {loading ? '—' : `${targetHours.toFixed(1)}h`}
          </p>
          <p className="text-[11px] text-slate-600 leading-snug">
            Goal sleep for tonight based on your profile.
          </p>
        </div>

        {/* Consistency */}
        <div className="space-y-1">
          <p className="font-semibold tracking-[0.14em] uppercase text-slate-500">
            Consistency
          </p>
          <div className="h-1.5 w-full rounded-full bg-slate-100 mb-1" />
          <p className="text-[11px] text-slate-500 leading-snug">
            Not enough data
          </p>
        </div>

        {/* Sleep deficit */}
        <div className="space-y-1 text-right">
          <p className="font-semibold tracking-[0.14em] uppercase text-slate-500">
            Sleep deficit
          </p>
          <p className="text-lg font-semibold text-slate-900">0.0h</p>
          <p className="text-[11px] text-slate-600 leading-snug">
            Ahead of weekly target
          </p>
        </div>
      </div>
    </section>
  )
}

function SleepStageGrid() {
  const stages = [
    { label: 'Deep', description: 'Restorative sleep for physical recovery' },
    { label: 'REM', description: 'Dream sleep for memory and learning' },
    { label: 'Light', description: 'Transitional sleep between stages' },
    { label: 'Awake', description: 'Brief awakenings during sleep' },
  ]

  return (
    <section className="grid grid-cols-2 gap-3">
      {stages.map((stage) => (
        <div
          key={stage.label}
          className="rounded-lg bg-white border border-slate-200 px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
            <span className="uppercase tracking-[0.12em]">{stage.label}</span>
            <span>0%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 mb-2" />
          <p className="text-[11px] text-slate-600 leading-snug">
            {stage.description}
          </p>
        </div>
      ))}
    </section>
  )
}

function SimpleSleepGauge({ totalMinutes, targetMinutes }: { totalMinutes: number; targetMinutes: number }) {
  const hours = totalMinutes ? Math.floor(totalMinutes / 60) : 0
  const minutes = totalMinutes ? totalMinutes % 60 : 0
  const percent = totalMinutes && targetMinutes > 0 ? Math.round((totalMinutes / targetMinutes) * 100) : 0
  const angle = (percent / 100) * 360
  const goalHours = targetMinutes > 0 ? (targetMinutes / 60).toFixed(1) : '0'

  return (
    <div
      className="relative flex h-[176px] w-[176px] items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(#22c55e ${angle}deg, #e5e7eb 0deg)`,
      }}
    >
      {/* Outer inner disc (slightly larger to thin the ring) */}
      <div className="h-[156px] w-[156px] rounded-full bg-white border border-slate-100" />
      {/* Inner goal ring */}
      <div className="absolute h-[132px] w-[132px] rounded-full border border-dashed border-slate-200" />
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-1">
        <span className="text-[28px] font-semibold leading-none text-slate-900">
          {hours}
          <span className="align-top text-[16px] font-normal ml-[2px]">h</span>{' '}
          {minutes}
        </span>
        <span className="text-[11px] text-slate-500">{percent}% of goal</span>
        <span className="text-[11px] text-slate-400">Goal {goalHours}h</span>
      </div>
    </div>
  )
}

function SleepDebtCard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeklyDeficit, setWeeklyDeficit] = useState<number | null>(null)
  const [requiredDaily, setRequiredDaily] = useState<number | null>(null)
  const [category, setCategory] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchDeficit = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/sleep/deficit', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(String(res.status))
        }
        const json = await res.json()
        if (cancelled) return
        setWeeklyDeficit(json.weeklyDeficit ?? 0)
        setRequiredDaily(json.requiredDaily ?? 7.5)
        setCategory(json.category ?? 'low')
      } catch (err: any) {
        console.error('[SleepDebtCard] error:', err)
        if (!cancelled) setError('Unable to load sleep debt yet.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDeficit()

    const handleRefresh = () => fetchDeficit()
    window.addEventListener('sleep-refreshed', handleRefresh)
    return () => {
      cancelled = true
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-32 bg-slate-200/70 dark:bg-slate-700/60 rounded animate-pulse" />
        <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-700/60 rounded animate-pulse" />
      </div>
    )
  }

  if (error || weeklyDeficit === null || requiredDaily === null) {
    return (
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {error || "No sleep debt data yet. Log a few days of main sleep to unlock this view."}
      </div>
    )
  }

  const hoursBehind = weeklyDeficit
  const absHours = Math.abs(hoursBehind).toFixed(1)
  const isSurplus = hoursBehind <= 0

  let label: string
  let message: string
  let toneClasses: string

  if (isSurplus) {
    label = 'Sleep banked'
    message = 'You are slightly ahead on sleep this week. Protect this buffer on heavy shift runs.'
    toneClasses = 'bg-emerald-50/80 text-emerald-700 border-emerald-200'
  } else if (category === 'low') {
    label = 'Mild sleep debt'
    message = 'You are only a little behind. One or two early nights or a recovery nap will catch you up.'
    toneClasses = 'bg-sky-50/80 text-sky-700 border-sky-200'
  } else if (category === 'medium') {
    label = 'Moderate sleep debt'
    message = 'Plan extra sleep blocks on off days and avoid stacking more night shifts if you can.'
    toneClasses = 'bg-amber-50/80 text-amber-700 border-amber-200'
  } else {
    label = 'High sleep debt'
    message = 'You are well behind on recovery. Treat this like a high‑risk week for fatigue and mistakes.'
    toneClasses = 'bg-rose-50/80 text-rose-700 border-rose-200'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400">
            Weekly sleep debt
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Based on your last 7 shifted days and ideal nightly target.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Behind / ahead</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {isSurplus ? '-' : '+'}
            {absHours}h
          </p>
        </div>
      </div>
      <div className={`rounded-2xl px-3 py-2 text-[11px] font-medium border ${toneClasses}`}>
        <p className="text-[11px] mb-0.5">{label}</p>
        <p className="text-[11px] font-normal opacity-90">{message}</p>
      </div>
    </div>
  )
}

/**
 * Get shifted day label (07:00 → 07:00)
 */
function getShiftedDayLabel(shiftedDayStart: string): string {
  const start = new Date(shiftedDayStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  
  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  
  const isToday = start.toDateString() === new Date().toDateString()
  
  if (isToday) {
    return `Today's Sleep (${formatTime(start)} → ${formatTime(end)})`
  }
  
  return `${formatDate(start)} (${formatTime(start)} → ${formatTime(end)})`
}

export function ShiftWorkerSleepPage() {
  const router = useRouter()
  const [shiftedDays, setShiftedDays] = useState<ShiftedDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [logModalType, setLogModalType] = useState<SleepType>('main')
  const [logModalStart, setLogModalStart] = useState<Date | null>(null)
  const [logModalEnd, setLogModalEnd] = useState<Date | null>(null)
  const [editingSession, setEditingSession] = useState<SleepSession | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Last 30 days history for guidance
  const [historyDays, setHistoryDays] = useState<SleepHistoryDay[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)
  const [sleepGoalHours, setSleepGoalHours] = useState<number | null>(null)

  // Fetch shifted day sleep data
  const fetchShiftedDays = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sleep/24h-grouped?days=3', { cache: 'no-store' })
      
      if (!res.ok) {
        console.error('[ShiftWorkerSleepPage] Failed to fetch:', res.status)
        setShiftedDays([])
        return
      }

      const data = await res.json()
      setShiftedDays(data.days || [])
      
      // Auto-select today if available
      if (data.currentShiftedDay && !selectedDay) {
        setSelectedDay(data.currentShiftedDay)
      }
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] Error:', err)
      setShiftedDays([])
    } finally {
      setLoading(false)
    }
  }, [selectedDay])

  useEffect(() => {
    fetchShiftedDays()
    
    // Listen for sleep refresh events
    let refreshTimeout: NodeJS.Timeout | null = null
    const handleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        fetchShiftedDays()
      }, 300)
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [fetchShiftedDays])

  // Fetch profile-based sleep goal (takes into account age, sex, etc. set in profile)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        const goal = json?.profile?.sleep_goal_h
        if (typeof goal === 'number' && !Number.isNaN(goal) && goal > 0 && goal < 16) {
          setSleepGoalHours(goal)
        }
      } catch (err) {
        console.error('[ShiftWorkerSleepPage] profile fetch error:', err)
      }
    }

    fetchProfile()
  }, [])

  // Fetch last 30 days history for guidance card
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true)
        const res = await fetch('/api/sleep/history', { cache: 'no-store' })
        if (!res.ok) {
          console.error('[ShiftWorkerSleepPage] history error:', res.status)
          setHistoryDays([])
          return
        }
        const json = await res.json()
        const items: any[] = json.items || []

        const byDate: Record<string, { totalMinutes: number; shiftLabel: string }> = {}

        for (const item of items) {
          const date: string | null =
            item.date ||
            (item.start_ts ? new Date(item.start_ts).toISOString().slice(0, 10) : null)
          if (!date) continue

          const start = item.start_ts || item.start_at
          const end = item.end_ts || item.end_at
          let minutes = 0
          if (item.sleep_hours != null) {
            minutes = Math.round(Number(item.sleep_hours) * 60)
          } else if (start && end) {
            minutes = Math.max(
              0,
              Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000),
            )
          }

          if (!byDate[date]) {
            byDate[date] = {
              totalMinutes: 0,
              shiftLabel: item.shift_label || 'OFF',
            }
          }
          byDate[date].totalMinutes += minutes
          if (byDate[date].shiftLabel === 'OFF' && item.shift_label) {
            byDate[date].shiftLabel = item.shift_label
          }
        }

        const entries: SleepHistoryDay[] = Object.entries(byDate)
          .map(([date, v]) => ({
            date,
            totalMinutes: v.totalMinutes,
            shiftLabel: v.shiftLabel,
          }))
          .sort((a, b) => (a.date < b.date ? 1 : -1))

        setHistoryDays(entries)
        if (!selectedHistoryDate && entries.length > 0) {
          setSelectedHistoryDate(entries[0].date)
        }
      } catch (err) {
        console.error('[ShiftWorkerSleepPage] history fetch error:', err)
        setHistoryDays([])
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchHistory()
  }, [selectedHistoryDate])

  // Handle quick log button click
  const handleQuickLog = async (type: SleepType, start: Date, end: Date) => {
    setLogModalType(type)
    setLogModalStart(start)
    setLogModalEnd(end)
    setIsLogModalOpen(true)
  }

  // Handle log sleep submit
  const handleLogSleep = async (data: {
    type: 'sleep' | 'nap'
    start: string
    end: string
    quality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
    notes?: string
  }) => {
    try {
      const res = await fetch('/api/sleep/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          startAt: data.start,
          endAt: data.end,
          quality: data.quality,
          notes: data.notes || null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to save sleep' }))
        throw new Error(errorData.error || 'Failed to save sleep')
      }

      // Trigger all recalculations
      window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
      }
      
      // Trigger circadian, sleep deficit, shift rhythm, tonight's target recalculations
      fetch('/api/shift-rhythm?force=true').catch(() => {})
      fetch('/api/sleep/deficit').catch(() => {})
      fetch('/api/sleep/tonight-target').catch(() => {})
      
      router.refresh()
      
      setIsLogModalOpen(false)
      setLogModalStart(null)
      setLogModalEnd(null)
      
      // Refresh after a moment
      setTimeout(() => {
        fetchShiftedDays()
      }, 500)
    } catch (error) {
      console.error('[ShiftWorkerSleepPage] Error logging sleep:', error)
      throw error
    }
  }

  // Handle delete
  const handleDeleteClick = (sessionId: string) => {
    setDeletingSessionId(sessionId)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSessionId) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/sleep/sessions/${deletingSessionId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(errorData.error || 'Failed to delete session')
        setIsDeleting(false)
        setDeletingSessionId(null)
        return
      }

      setDeletingSessionId(null)
      
      // Trigger all recalculations
      window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
      }
      
      // Trigger circadian, sleep deficit, shift rhythm, tonight's target recalculations
      fetch('/api/shift-rhythm?force=true').catch(() => {})
      fetch('/api/sleep/deficit').catch(() => {})
      fetch('/api/sleep/tonight-target').catch(() => {})
      
      router.refresh()
      
      setTimeout(() => {
        fetchShiftedDays()
      }, 500)
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] Delete error:', err)
      alert('Failed to delete session')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingSessionId(null)
    setIsDeleting(false)
  }

  // Get selected day data
  const selectedDayData = selectedDay 
    ? shiftedDays.find(d => d.date === selectedDay)
    : shiftedDays[0] // Default to most recent

  // Calculate shifted day end
  const shiftedDayEnd = selectedDayData 
    ? new Date(new Date(selectedDayData.shiftedDayStart).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : ''

  // Show loading state
  if (loading && shiftedDays.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500">Loading sleep data...</p>
        </div>
      </div>
    )
  }

  const selectedHistory =
    historyDays.find((d) => d.date === selectedHistoryDate) || historyDays[0] || null

  const getHistoryRating = (totalMinutes: number) => {
    const goal = sleepGoalHours ?? 7.5
    if (!totalMinutes || totalMinutes <= 0) {
      return {
        label: 'No sleep logged',
        message: 'Log your main sleep and naps to get guidance.',
        tone: 'neutral' as const,
      }
    }
    const hours = totalMinutes / 60
    if (hours >= goal + 0.5) {
      return {
        label: 'Doing great',
        message: 'You hit or slightly exceeded your ideal sleep dose for your profile. Keep this pattern when you can.',
        tone: 'good' as const,
      }
    }
    if (hours >= goal - 0.5) {
      return {
        label: 'Okay, could be better',
        message: 'You are close to your ideal amount – another 30–60 minutes would really help recovery.',
        tone: 'ok' as const,
      }
    }
    if (hours >= goal - 2) {
      return {
        label: 'Falling behind',
        message: 'You are short on sleep for your needs. Plan a recovery block or nap on your next off‑duty window.',
        tone: 'warn' as const,
      }
    }
    return {
      label: 'Running on fumes',
      message: 'Very short sleep for your profile. Treat today as high‑risk for fatigue, cravings and mistakes.',
      tone: 'bad' as const,
    }
  }

  const todayTotalMinutes = selectedDayData?.totalMinutes ?? 0
  const targetMinutes = Math.round((sleepGoalHours ?? 7.5) * 60)

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Page header with back arrow */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:bg-slate-50 hover:text-slate-800 transition"
          aria-label="Back to home"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xs font-semibold tracking-[0.22em] text-slate-500 uppercase">
          Sleep
        </h1>
      </div>

      {/* Header: match Body Clock style */}
      <section className="rounded-xl bg-white px-5 py-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <SimpleSleepGauge totalMinutes={todayTotalMinutes} targetMinutes={targetMinutes} />
          <div className="space-y-1 max-w-xs">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              {todayTotalMinutes ? "Today's sleep" : "Log your sleep"}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {todayTotalMinutes
                ? `${(todayTotalMinutes / 60).toFixed(1)} hours logged across main sleep and naps.`
                : "No sleep logged yet. Log main sleep or naps to keep your body clock on track."}
            </p>
          </div>
        </div>
      </section>

      {/* Sleep stages snapshot */}
      <SleepStageGrid />

      {/* Sleep metrics card */}
      <SleepMetricsCard
        targetHours={sleepGoalHours ?? 7.5}
        loading={sleepGoalHours == null}
      />

      {/* Weekly sleep debt (Google Fit style) */}
      <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <SleepDebtCard />
      </section>

      {/* 30-day sleep guide */}
      <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400">
              Last 30 days guide
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Pick a day to see if your sleep was enough for that shift, based on your profile.
            </p>
          </div>
          {historyDays.length > 0 && (
            <select
              className="text-xs rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 px-3 py-1 text-slate-700 dark:text-slate-100"
              value={selectedHistory?.date ?? historyDays[0].date}
              onChange={(e) => setSelectedHistoryDate(e.target.value)}
            >
              {historyDays.map((d) => {
                const dateObj = new Date(d.date + 'T12:00:00')
                const label = dateObj.toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })
                const shift = d.shiftLabel && d.shiftLabel !== 'OFF' ? ` · ${d.shiftLabel}` : ''
                return (
                  <option key={d.date} value={d.date}>
                    {label}{shift}
                  </option>
                )
              })}
            </select>
          )}
        </div>

        {historyLoading && !selectedHistory ? (
          <div className="py-6 space-y-2">
            <div className="h-4 w-32 bg-slate-200/70 dark:bg-slate-700/60 rounded animate-pulse" />
            <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-700/60 rounded animate-pulse" />
          </div>
        ) : selectedHistory ? (
          (() => {
            const rating = getHistoryRating(selectedHistory.totalMinutes)
            const hours = (selectedHistory.totalMinutes / 60) || 0
            const toneClasses =
              rating.tone === 'good'
                ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200'
                : rating.tone === 'ok'
                ? 'bg-sky-50/80 text-sky-700 border-sky-200'
                : rating.tone === 'warn'
                ? 'bg-amber-50/80 text-amber-700 border-amber-200'
                : rating.tone === 'bad'
                ? 'bg-rose-50/80 text-rose-700 border-rose-200'
                : 'bg-slate-50/80 text-slate-700 border-slate-200'

            return (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Total sleep that shifted day
                    </p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {hours.toFixed(1)}h
                    </p>
                  </div>
                  {selectedHistory.shiftLabel && selectedHistory.shiftLabel !== 'OFF' && (
                    <span className="inline-flex items-center rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 px-2.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                      {selectedHistory.shiftLabel}
                    </span>
                  )}
                </div>
                <div
                  className={`rounded-2xl px-3 py-2 text-[11px] font-medium border ${toneClasses}`}
                >
                  <p className="text-[11px] mb-0.5">{rating.label}</p>
                  <p className="text-[11px] font-normal opacity-90">{rating.message}</p>
                </div>
              </div>
            )
          })()
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No sleep history in the last 30 days yet. Start logging to unlock guidance.
          </p>
        )}
      </section>

      {/* Quick Sleep Log Buttons */}
      <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-3">
          Quick log for shift workers
        </h2>
        <QuickSleepLogButtons onLogSleep={handleQuickLog} />
      </section>

      {/* Sleep Timeline Bar */}
      {selectedDayData && selectedDayData.sessions.length > 0 && (
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <h2 className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-3">
            24‑hour sleep timeline
          </h2>
          <SleepTimelineBar
            sessions={selectedDayData.sessions}
            shiftedDayStart={selectedDayData.shiftedDayStart}
            shiftedDayEnd={shiftedDayEnd}
            onSessionClick={(session) => setEditingSession(session)}
          />
        </section>
      )}

      {/* Sleep Sessions List */}
      <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-3">
          Logged sleep
        </h2>
        {loading ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading sessions...</p>
          </div>
        ) : selectedDayData && selectedDayData.sessions.length > 0 ? (
          <SleepSessionList
            sessions={selectedDayData.sessions}
            onEdit={(session) => setEditingSession(session)}
            onDelete={handleDeleteClick}
          />
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-300 mb-2">
              No sleep sessions logged for this shifted day.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Use the quick log buttons above after each shift to keep your Body Clock accurate.
            </p>
          </div>
        )}
      </section>

      {/* Log Sleep Modal */}
      <LogSleepModal
        open={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false)
          setLogModalStart(null)
          setLogModalEnd(null)
        }}
        onSubmit={handleLogSleep}
        defaultType={logModalType === 'nap' || logModalType === 'pre_shift_nap' ? 'nap' : 'sleep'}
        defaultStart={logModalStart}
        defaultEnd={logModalEnd}
      />

      {/* Edit Session Modal */}
      {editingSession && (
        <SleepEditModal
          open={true}
          session={{
            id: editingSession.id,
            session_type: editingSession.type === 'nap' ? 'nap' : 'main',
            start_time: editingSession.start_at,
            end_time: editingSession.end_at,
            durationHours: editingSession.durationHours,
            quality: editingSession.quality,
            source: 'manual',
          }}
          onClose={() => setEditingSession(null)}
          onSuccess={() => {
            setEditingSession(null)
            
            // Trigger all recalculations
            window.dispatchEvent(new CustomEvent('sleep-refreshed'))
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('sleepRefresh', Date.now().toString())
            }
            
            // Trigger circadian, sleep deficit, shift rhythm, tonight's target recalculations
            fetch('/api/shift-rhythm?force=true').catch(() => {})
            fetch('/api/sleep/deficit').catch(() => {})
            fetch('/api/sleep/tonight-target').catch(() => {})
            
            router.refresh()
            
            setTimeout(() => {
              fetchShiftedDays()
            }, 500)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingSessionId && (
        <DeleteSleepConfirmModal
          open={!!deletingSessionId}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          loading={isDeleting}
        />
      )}
    </div>
  )
}

