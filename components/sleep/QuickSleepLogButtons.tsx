'use client'

import { useState, useEffect } from 'react'
import { Moon, Coffee, Zap, Heart, Plus } from 'lucide-react'
import type { SleepType } from '@/lib/sleep/predictSleep'

type QuickSleepLogButtonsProps = {
  onLogSleep: (type: SleepType, start: Date, end: Date) => void
  loading?: boolean
}

export function QuickSleepLogButtons({ onLogSleep, loading = false }: QuickSleepLogButtonsProps) {
  const [predictions, setPredictions] = useState<Record<SleepType, { start: Date; end: Date; reasoning: string } | null>>({
    main: null,
    post_shift: null,
    pre_shift_nap: null,
    recovery: null,
    nap: null,
  })

  useEffect(() => {
    // Fetch predictions for all types
    const fetchPredictions = async () => {
      const types: SleepType[] = ['main', 'post_shift', 'pre_shift_nap', 'recovery', 'nap']
      const newPredictions: typeof predictions = { ...predictions }
      
      for (const type of types) {
        try {
          const res = await fetch('/api/sleep/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type }),
          })
          
          if (res.ok) {
            const prediction = await res.json()
            newPredictions[type] = {
              start: new Date(prediction.suggestedStart),
              end: new Date(prediction.suggestedEnd),
              reasoning: prediction.reasoning,
            }
          }
        } catch (err) {
          console.error(`[QuickSleepLogButtons] Failed to predict ${type}:`, err)
        }
      }
      
      setPredictions(newPredictions)
    }
    
    fetchPredictions()
  }, [])

  const buttons = [
    {
      type: 'main' as SleepType,
      label: 'Main Sleep',
      icon: Moon,
      iconColor: 'text-slate-600 dark:text-slate-300',
      bgGradient: 'from-slate-50 to-slate-100/80',
      borderColor: 'border-slate-200/80 dark:border-slate-700/40',
      prediction: predictions.main,
    },
    {
      type: 'post_shift' as SleepType,
      label: 'Post-Shift Sleep',
      icon: Coffee,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgGradient: 'from-blue-50 to-blue-100/80',
      borderColor: 'border-blue-200/80 dark:border-blue-800/40',
      prediction: predictions.post_shift,
    },
    {
      type: 'pre_shift_nap' as SleepType,
      label: 'Pre-Shift Nap',
      icon: Zap,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      bgGradient: 'from-indigo-50 to-indigo-100/80',
      borderColor: 'border-indigo-200/80 dark:border-indigo-800/40',
      prediction: predictions.pre_shift_nap,
    },
    {
      type: 'recovery' as SleepType,
      label: 'Recovery Sleep',
      icon: Heart,
      iconColor: 'text-rose-600 dark:text-rose-400',
      bgGradient: 'from-rose-50 to-rose-100/80',
      borderColor: 'border-rose-200/80 dark:border-rose-800/40',
      prediction: predictions.recovery,
    },
    {
      type: 'nap' as SleepType,
      label: 'Custom Sleep',
      icon: Plus,
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgGradient: 'from-purple-50 to-purple-100/80',
      borderColor: 'border-purple-200/80 dark:border-purple-800/40',
      prediction: predictions.nap,
    },
  ]

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {buttons.map((button) => {
        const Icon = button.icon
        const hasPrediction = button.prediction !== null
        
        return (
          <button
            key={button.type}
            onClick={() => {
              if (button.prediction) {
                onLogSleep(button.type, button.prediction.start, button.prediction.end)
              }
            }}
            disabled={loading || !hasPrediction}
            className={`
              relative overflow-hidden rounded-xl p-4 text-left
              bg-gradient-to-br ${button.bgGradient}
              dark:from-slate-800/50 dark:to-slate-900/50
              border ${button.borderColor}
              dark:border-slate-700/40
              shadow-[0_4px_12px_rgba(15,23,42,0.06)]
              dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
              backdrop-blur-sm
              transition-all duration-200
              hover:shadow-[0_8px_20px_rgba(15,23,42,0.1)]
              dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)]
              hover:scale-[1.02] active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              ${hasPrediction ? 'cursor-pointer' : ''}
            `}
          >
            {/* Premium gradient overlays */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 dark:from-slate-800/60 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/50 dark:ring-slate-600/30 ring-inset" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-lg
                  bg-white/90 dark:bg-slate-800/50 backdrop-blur-sm
                  shadow-[0_2px_8px_rgba(15,23,42,0.08)]
                  dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
                  ${button.iconColor}
                  dark:text-slate-300
                `}>
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {button.label}
                </span>
              </div>
              
              {hasPrediction && button.prediction ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {formatTime(button.prediction.start)} → {formatTime(button.prediction.end)}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {button.prediction.reasoning}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200/60 dark:bg-slate-700/50 rounded animate-pulse" />
                  <div className="h-3 w-full bg-slate-200/60 dark:bg-slate-700/50 rounded animate-pulse" />
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

