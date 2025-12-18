'use client'

import { useEffect, useState } from 'react'
import type { SleepDeficitResponse, SleepDeficitCategory } from '@/lib/sleep/calculateSleepDeficit'

type SleepDeficitCardProps = {
  data?: SleepDeficitResponse | null
  loading?: boolean
}

export function SleepDeficitCard({ data: propData, loading: propLoading }: SleepDeficitCardProps) {
  const [data, setData] = useState<SleepDeficitResponse | null>(propData || null)
  const [loading, setLoading] = useState(propLoading ?? !propData)

  // Fetch sleep deficit if not provided
  useEffect(() => {
    if (propData) {
      setData(propData)
      setLoading(false)
      return
    }

    let cancelled = false
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/sleep/deficit', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (!cancelled) {
          setData(json)
        }
      } catch (err) {
        console.error('[SleepDeficitCard] Failed to fetch:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    
    fetchData()
    
    // Listen for sleep refresh events
    let refreshTimeout: NodeJS.Timeout | null = null
    const handleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        if (!cancelled) fetchData()
      }, 300)
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      cancelled = true
      if (refreshTimeout) clearTimeout(refreshTimeout)
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [propData])

  // Determine status and display values
  const getStatus = () => {
    if (!data) return { text: 'No data', color: 'slate', bgColor: 'bg-slate-50', textColor: 'text-slate-700', iconBg: 'bg-slate-500' }
    
    const { category } = data
    
    if (category === 'surplus' || category === 'low') {
      return { text: 'On track', color: 'emerald', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', iconBg: 'bg-emerald-500' }
    } else if (category === 'medium') {
      return { text: 'Needs attention', color: 'amber', bgColor: 'bg-amber-50', textColor: 'text-amber-700', iconBg: 'bg-amber-500' }
    } else {
      return { text: 'High deficit', color: 'rose', bgColor: 'bg-rose-50', textColor: 'text-rose-700', iconBg: 'bg-rose-500' }
    }
  }

  const getExplanation = (category: SleepDeficitCategory | null): string => {
    if (!category) return ''
    
    switch (category) {
      case 'high':
        return "You're about a full night behind on sleep this week. Prioritise recovery over the next few shifts."
      case 'medium':
        return "You're carrying some sleep debt. One or two earlier nights will help you catch up."
      case 'low':
        return "You're close to your weekly sleep target. Keep your routine steady."
      case 'surplus':
        return "You're slightly ahead of your sleep target. Maintain this rhythm."
      default:
        return ''
    }
  }

  const status = getStatus()
  
  // Calculate display values
  const hasData = data && data.weeklyDeficit !== undefined && data.weeklyDeficit !== null
  const weeklyDeficitHours = data?.weeklyDeficit ?? 0
  
  // Main number: absolute value of deficit in hours
  const displayValue = hasData ? `${Math.abs(weeklyDeficitHours).toFixed(1)} h` : '— h'
  
  // Label based on deficit/surplus
  const displayLabel = hasData
    ? (weeklyDeficitHours > 0 
        ? 'Behind your weekly sleep target' 
        : 'Ahead of your weekly sleep target')
    : 'Not enough data yet'
  
  // Explanation text
  const explanation = hasData ? getExplanation(data.category) : ''

  return (
    <div className="rounded-[24px] bg-white/95 border border-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] px-5 py-4">
      <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
        Sleep deficit
      </h3>

      {loading ? (
        <div className="mt-2 space-y-2">
          <div className="h-6 w-24 bg-slate-200 animate-pulse rounded" />
          <div className="h-4 w-16 bg-slate-200 animate-pulse rounded" />
          <div className="mt-3 h-6 w-20 bg-slate-200 animate-pulse rounded-full" />
        </div>
      ) : (
        <>
          <p className="mt-2 text-[24px] font-semibold text-slate-900 leading-tight">
            {displayValue}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{displayLabel}</p>

          {/* Explanation text */}
          {explanation && (
            <p className="mt-2 text-[11px] text-slate-600 leading-relaxed">
              {explanation}
            </p>
          )}

          {/* Category badge - only show if we have data */}
          {hasData && (
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full ${status.bgColor} px-3 py-1 text-[11px] font-medium ${status.textColor}`}>
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${status.iconBg} text-[10px] text-white`}>
                {status.color === 'emerald' ? '✓' : status.color === 'amber' ? '!' : '⚠'}
              </span>
              <span>{status.text}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

