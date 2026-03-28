"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { ShiftLagMetrics, ShiftLagLevel } from '@/lib/shiftlag/calculateShiftLag'

function MiniRing({
  value,
  maxValue = 100,
  level,
}: {
  value: number
  maxValue?: number
  level: ShiftLagLevel
}) {
  const size = 54
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min(value / maxValue, 1)
  const offset = circumference - percentage * circumference
  const color =
    level === 'low' ? '#16a34a' : level === 'moderate' ? '#d97706' : '#dc2626'

  return (
    <div className="relative h-[54px] w-[54px]">
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900 tabular-nums">
        {Math.max(0, Math.min(100, value))}
      </span>
    </div>
  )
}

export function ShiftLagCard() {
  const [data, setData] = useState<ShiftLagMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch('/api/shiftlag', { cache: 'no-store' })
      
      if (!res.ok) {
        const errorText = await res.text()
        let errorJson
        try {
          errorJson = JSON.parse(errorText)
        } catch {
          errorJson = { error: errorText || `HTTP ${res.status}` }
        }
        console.error('[ShiftLagCard] API error:', res.status, errorJson)
        setError(errorJson.error || `Failed to fetch: ${res.status}`)
        return
      }
      
      const json = await res.json()
      if (json.error) {
        setError(json.error)
        return
      }
      
      // Validate that we have the required fields
      if (json.score !== undefined && json.level && json.explanation) {
        // Ensure all score components are present
        const validatedData = {
          ...json,
          sleepDebtScore: json.sleepDebtScore ?? 0,
          misalignmentScore: json.misalignmentScore ?? 0,
          instabilityScore: json.instabilityScore ?? 0,
        }
        setData(validatedData)
      } else {
        console.warn('[ShiftLagCard] Invalid data structure:', json)
        setError('Invalid data received')
      }
    } catch (err: any) {
      console.error('[ShiftLagCard] Fetch error:', err)
      setError('Unable to load ShiftLag data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Listen for sleep and rota refresh events
    const handleRefresh = () => {
      fetchData()
    }
    
    window.addEventListener('sleep-refreshed', handleRefresh)
    window.addEventListener('rota-saved', handleRefresh)
    window.addEventListener('rota-cleared', handleRefresh)
    
    return () => {
      window.removeEventListener('sleep-refreshed', handleRefresh)
      window.removeEventListener('rota-saved', handleRefresh)
      window.removeEventListener('rota-cleared', handleRefresh)
    }
  }, [])

  const getLevelColor = (level: ShiftLagLevel) => {
    switch (level) {
      case 'low':
        return {
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-200/50 dark:border-emerald-800/40',
          badge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        }
      case 'moderate':
        return {
          bg: 'bg-amber-50/70 dark:bg-amber-950/30',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-200/50 dark:border-amber-800/40',
          badge: 'bg-amber-50 border-amber-200 text-amber-700',
        }
      case 'high':
        return {
          bg: 'bg-rose-50/70 dark:bg-rose-950/30',
          text: 'text-rose-700 dark:text-rose-300',
          border: 'border-rose-200/50 dark:border-rose-800/40',
          badge: 'bg-rose-50 border-rose-200 text-rose-700',
        }
    }
  }

  const colors = data ? getLevelColor(data.level) : null

  return (
    <section className="rounded-xl bg-white border border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <Link
        href="/shift-lag"
        className="block px-5 py-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700">
              Shift Lag
            </span>
            <p className="text-sm font-semibold text-slate-900">
              Jet lag from your shifts
            </p>

            {loading ? (
              <div className="space-y-2 pt-1">
                <div className="h-4 w-36 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-52 rounded bg-slate-200 animate-pulse" />
              </div>
            ) : error ? (
              <p className="text-sm text-slate-600">{error}</p>
            ) : !data || (data.score === 0 && data.explanation.includes("Track a few days")) ? (
              <>
                <p className="text-sm font-semibold text-slate-900 pt-1">
                  Not enough data yet
                </p>
                <p className="text-sm leading-relaxed text-slate-700 max-w-[26ch]">
                  Track a few days of sleep and shifts to unlock your ShiftLag score.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-lg font-semibold tabular-nums text-slate-900">{data.score}/100</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${colors?.badge || 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    {data.level}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed max-w-[30ch]">
                  {data.explanation}
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <ChevronRight className="h-4 w-4 text-slate-500" />
            {!loading && !error && data && (
              <MiniRing value={data.score} level={data.level} />
            )}
          </div>
        </div>
      </Link>
    </section>
  )
}

