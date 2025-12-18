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
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min(value / maxValue, 1)
  const offset = circumference - (percentage * circumference)
  const gradientId = `gradient-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col items-center group">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Subtle outer glow on hover */}
        <div 
          className="absolute inset-0 rounded-full blur-sm opacity-0 group-hover:opacity-60 transition-opacity duration-300"
          style={{ 
            background: `radial-gradient(circle, ${glow}, transparent 80%)`,
            transform: 'scale(1.15)'
          }}
        />
        
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 relative z-10"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradient.from} />
              <stop offset="100%" stopColor={gradient.to} />
            </linearGradient>
          </defs>
          
          {/* Inner background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth - 1}
          />
          
          {/* Progress ring with gradient */}
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
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center">
            <span className="text-[15px] font-bold text-slate-900 leading-none">
              {value}
            </span>
            <span className="text-[9px] font-semibold text-slate-500 mt-0.5">
              /{maxValue}
            </span>
          </div>
        </div>
      </div>
      
      {/* Label */}
      <span className="mt-3 text-[11px] font-semibold text-slate-700 tracking-wide text-center">
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
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-700',
        }
      case 'moderate':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-700',
        }
      case 'high':
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          badge: 'bg-rose-100 text-rose-700',
        }
    }
  }

  const colors = data ? getLevelColor(data.level) : null

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
      {/* Premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/50" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">
              ShiftLag
            </p>
            <h2 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900">
              Jet lag from your shifts
            </h2>
          </div>
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-600 hover:text-slate-900 transition-all hover:scale-105 active:scale-95"
            aria-label="Learn more about ShiftLag"
          >
            <Info className="h-4 w-4" strokeWidth={2.5} />
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
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50/80 border border-amber-200/60">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-amber-600 text-xs font-bold">ℹ</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-amber-900 mb-1">ShiftLag</p>
                <p className="text-[12px] text-amber-700 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        ) : !data || (data.score === 0 && data.explanation.includes('Track a few days')) ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center text-slate-500 text-[13px] leading-relaxed px-4">
            <p className="font-semibold mb-2">Not enough data yet</p>
            <p>Track a few days of sleep and shifts to unlock your ShiftLag score.</p>
          </div>
        ) : data ? (
          <div className="space-y-5">
            {/* Main score and level */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-bold text-slate-900 tabular-nums">
                  {data.score}
                </span>
                <span className="text-[16px] font-medium text-slate-500">/ 100</span>
              </div>
              <div className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${colors?.badge || 'bg-slate-100 text-slate-700'}`}>
                {data.level}
              </div>
            </div>

            {/* Explanation */}
            <p className="text-[13px] text-slate-600 leading-relaxed">
              {data.explanation}
            </p>

            {/* Score Component Rings */}
            <div className="pt-4 border-t border-slate-200/60">
              <p className="text-[12px] font-bold text-slate-900 tracking-tight mb-4">
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
            <div className="pt-3 border-t border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-600">Sleep debt (7 days)</span>
                <span className="font-semibold text-slate-900">{data.drivers.sleepDebt}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-600">Night work during biological night</span>
                <span className="font-semibold text-slate-900">{data.drivers.misalignment}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-600">Shift start variation</span>
                <span className="font-semibold text-slate-900">{data.drivers.instability}</span>
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

