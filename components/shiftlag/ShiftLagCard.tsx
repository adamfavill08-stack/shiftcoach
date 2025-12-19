'use client'

import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import type { ShiftLagMetrics, ShiftLagLevel } from '@/lib/shiftlag/calculateShiftLag'
import { ShiftLagInfoModal } from './ShiftLagInfoModal'

function RingGauge({ 
  value, 
  maxValue,
  gradient, 
  glow, 
  label 
}: { 
  value: number
  maxValue: number
  gradient: { from: string; to: string }
  glow: string
  label: string 
}) {
  const size = 72
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min(value / maxValue, 1)
  const offset = circumference - (percentage * circumference)
  const gradientId = `gradient-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col items-center">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        {/* Ring container glow */}
        <div className="absolute inset-[-8px] rounded-full bg-gradient-to-br from-slate-100/50 to-transparent blur-md" />
        
        {/* Ring container */}
        <div className="relative h-16 w-16 rounded-full bg-white/60 border border-slate-200/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="absolute inset-1.5 rounded-full border border-slate-200/40 bg-white/50" />
          
          {/* SVG ring overlay */}
          <svg
            width={size}
            height={size}
            className="absolute inset-0 transform -rotate-90"
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradient.from} stopOpacity="0.8" />
                <stop offset="100%" stopColor={gradient.to} stopOpacity="0.8" />
              </linearGradient>
            </defs>
            
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={strokeWidth - 1}
              strokeOpacity="0.6"
            />
            
            {/* Progress ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <span className="text-sm font-semibold text-slate-900 tabular-nums leading-none">
              {value}
            </span>
            <span className="text-[9px] font-medium text-slate-500 mt-0.5">
              /{maxValue}
            </span>
          </div>
        </div>
      </div>
      
      {/* Label */}
      <span className="mt-2.5 text-[11px] font-medium text-slate-600 text-center">
        {label}
      </span>
    </div>
  )
}

export function ShiftLagCard() {
  const [data, setData] = useState<ShiftLagMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

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
      console.log('[ShiftLagCard] Received data:', json)
      
      if (json.error) {
        console.error('[ShiftLagCard] API returned error:', json.error)
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
        console.log('[ShiftLagCard] Setting data with scores:', {
          sleepDebt: validatedData.sleepDebtScore,
          misalignment: validatedData.misalignmentScore,
          instability: validatedData.instabilityScore,
        })
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
          bg: 'bg-emerald-50/70',
          text: 'text-emerald-700',
          border: 'border-emerald-200/50',
          badge: 'bg-emerald-50/70 border-emerald-200/50 text-emerald-700',
        }
      case 'moderate':
        return {
          bg: 'bg-amber-50/70',
          text: 'text-amber-700',
          border: 'border-amber-200/50',
          badge: 'bg-amber-50/70 border-amber-200/50 text-amber-700',
        }
      case 'high':
        return {
          bg: 'bg-rose-50/70',
          text: 'text-rose-700',
          border: 'border-rose-200/50',
          badge: 'bg-rose-50/70 border-rose-200/50 text-rose-700',
        }
    }
  }

  const colors = data ? getLevelColor(data.level) : null

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white/75 backdrop-blur-xl border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] p-6">
      {/* Highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 via-transparent to-transparent" />
      
      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">
              Jet lag from your shifts
            </h3>
          </div>
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="flex-shrink-0 h-8 w-8 rounded-full bg-transparent text-slate-400 hover:bg-slate-100/60 transition-colors flex items-center justify-center"
            aria-label="Learn more about ShiftLag"
          >
            <Info className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {loading ? (
          <div className="h-[180px] flex items-center justify-center">
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-8 w-24 bg-slate-200 rounded mx-auto" />
              <div className="h-4 w-full bg-slate-200 rounded" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-gradient-to-br from-slate-50/70 to-white border border-slate-200/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-amber-100/80 border border-amber-200/60 flex items-center justify-center">
                  <span className="text-amber-600 text-xs font-semibold">ℹ</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-900 mb-1">ShiftLag</p>
                <p className="text-sm text-slate-600 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        ) : !data || (data.score === 0 && data.explanation.includes('Track a few days')) ? (
          <div className="flex flex-col items-center justify-center text-center text-slate-600 space-y-2 py-8">
            <p className="text-sm font-medium text-slate-900">Not enough data yet</p>
            <p className="text-sm leading-relaxed text-slate-600 max-w-[22ch]">
              Track a few days of sleep and shifts to unlock your ShiftLag score.
            </p>
          </div>
        ) : data ? (
          <div className="space-y-5">
            {/* Main score and level */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-semibold text-slate-900 tabular-nums">
                  {data.score}
                </span>
                <span className="text-base font-medium text-slate-500">/ 100</span>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${colors?.badge || 'bg-slate-50/70 border-slate-200/50 text-slate-700'}`}>
                {data.level}
              </span>
            </div>

            {/* Explanation */}
            <p className="text-sm leading-relaxed text-slate-600">
              {data.explanation}
            </p>

            {/* Score Component Rings */}
            <div className="pt-4 border-t border-slate-200/50">
              <p className="text-xs font-semibold tracking-tight text-slate-900 mb-4">
                Score Components
              </p>
              <div className="grid grid-cols-3 gap-4">
                {/* Sleep Debt Ring */}
                <RingGauge
                  label="Sleep Debt"
                  value={data.sleepDebtScore}
                  maxValue={40}
                  gradient={{ from: "#ef4444", to: "#f87171" }}
                  glow="rgba(239, 68, 68, 0.4)"
                />
                
                {/* Misalignment Ring */}
                <RingGauge
                  label="Misalignment"
                  value={data.misalignmentScore}
                  maxValue={40}
                  gradient={{ from: "#f59e0b", to: "#fbbf24" }}
                  glow="rgba(245, 158, 11, 0.4)"
                />
                
                {/* Instability Ring */}
                <RingGauge
                  label="Instability"
                  value={data.instabilityScore}
                  maxValue={20}
                  gradient={{ from: "#8b5cf6", to: "#a78bfa" }}
                  glow="rgba(139, 92, 246, 0.4)"
                />
              </div>
            </div>

            {/* Sub-metrics */}
            <div className="pt-3 border-t border-slate-200/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Sleep debt (7 days)</span>
                <span className="font-semibold tabular-nums text-slate-900">{data.drivers.sleepDebt}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Night work during biological night</span>
                <span className="font-semibold tabular-nums text-slate-900">{data.drivers.misalignment}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Shift start variation</span>
                <span className="font-semibold tabular-nums text-slate-900">{data.drivers.instability}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Info Modal */}
      <ShiftLagInfoModal
        open={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        level={data?.level}
        score={data?.score}
      />
    </section>
  )
}

