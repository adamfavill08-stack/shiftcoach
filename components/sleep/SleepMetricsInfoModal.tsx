'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Sparkles } from 'lucide-react'

interface SleepMetricsInfoModalProps {
  open: boolean
  onClose: () => void
  tonightTarget: number | null
  consistencyScore: number | null
  sleepDeficit: {
    weeklyDeficit: number
    category: 'high' | 'medium' | 'low' | 'surplus'
  } | null
}

export function SleepMetricsInfoModal({
  open,
  onClose,
  tonightTarget,
  consistencyScore,
  sleepDeficit,
}: SleepMetricsInfoModalProps) {
  const [suggestions, setSuggestions] = useState<string | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.getElementById('phone-root') || document.body
    setContainer(el)
  }, [])

  useEffect(() => {
    if (open && !suggestions && !loadingSuggestions) {
      fetchSuggestions()
    }
  }, [open])

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const res = await fetch('/api/sleep/metrics-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tonightTarget,
          consistencyScore,
          sleepDeficit: sleepDeficit ? {
            weeklyDeficit: sleepDeficit.weeklyDeficit,
            category: sleepDeficit.category,
          } : null,
          weeklyDeficitHours: sleepDeficit?.weeklyDeficit ?? null,
          deficitCategory: sleepDeficit?.category ?? null,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to fetch suggestions')
      }

      const data = await res.json()
      setSuggestions(data.suggestions || 'No suggestions available at this time.')
    } catch (err) {
      console.error('[SleepMetricsInfoModal] Error fetching suggestions:', err)
      setSuggestions('Unable to load personalized suggestions. Please try again later.')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  if (!open || !container) return null

  const formatSuggestions = (text: string): React.ReactNode => {
    // Split by newlines and format
    const lines = text.split('\n').filter(line => line.trim())
    const elements: React.ReactNode[] = []
    let currentList: string[] = []
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        currentList.push(trimmed.substring(1).trim())
      } else {
        // If we have accumulated list items, render them
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${idx}`} className="space-y-2 mb-3 ml-2">
              {currentList.map((item, i) => (
                <li key={i} className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                  <span className="text-indigo-500 dark:text-indigo-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
          currentList = []
        }
        // Add paragraph
        if (trimmed) {
          elements.push(
            <p key={`para-${idx}`} className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
              {trimmed}
            </p>
          )
        }
      }
    })
    
    // Handle any remaining list items
    if (currentList.length > 0) {
      elements.push(
        <ul key="list-final" className="space-y-2 mb-3 ml-2">
          {currentList.map((item, i) => (
            <li key={i} className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
              <span className="text-indigo-500 dark:text-indigo-400 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    }
    
    return <>{elements}</>
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div
        className="relative w-full max-w-md max-h-[90vh] bg-white dark:bg-slate-900/95 backdrop-blur-xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)] overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-700/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-white/85 dark:to-slate-950/60" />
        
        {/* Inner ring for premium feel */}
        <div className="pointer-events-none absolute inset-0 rounded-t-[32px] sm:rounded-[32px] ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
        
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100/80 dark:border-slate-700/50 bg-gradient-to-b from-white dark:from-slate-900/70 to-slate-50/50 dark:to-slate-900/50">
          <div>
            <h2 className="text-[19px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Sleep Metrics Explained
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              Understanding your sleep data
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all hover:scale-105 active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Tonight's Target */}
          <section>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[12px] font-bold">
                1
              </span>
              Tonight&apos;s Target
            </h3>
            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
              This is your recommended sleep duration for tonight, calculated based on:
            </p>
            <ul className="space-y-1.5 mb-3 ml-8">
              <li className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span>Your current sleep deficit (how far behind or ahead you are on weekly sleep)</span>
              </li>
              <li className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span>Your upcoming shift type (night, day, or off)</span>
              </li>
              <li className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span>Your base sleep need (typically 7.5 hours for most shift workers)</span>
              </li>
            </ul>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 italic">
              The target adjusts to help you catch up on sleep debt or maintain your rhythm, tailored to your shift schedule.
            </p>
          </section>

          {/* Sleep Consistency */}
          <section>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[12px] font-bold">
                2
              </span>
              Sleep Consistency
            </h3>
            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
              This score (0-100) measures how regular your bedtime is across the last 7 days:
            </p>
            <ul className="space-y-1.5 mb-3 ml-8">
              <li className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span><strong>80-100:</strong> Very consistent bedtimes (ideal for shift workers)</span>
              </li>
              <li className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span><strong>60-79:</strong> Moderately consistent (some variation is normal with shift changes)</span>
              </li>
              <li className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span><strong>Below 60:</strong> High variation in bedtimes (may impact recovery)</span>
              </li>
            </ul>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 italic mb-3">
              Calculated from the standard deviation of your main sleep bedtimes. Lower variation = higher score.
            </p>
            <p className="text-[12px] text-slate-600 dark:text-slate-300">
              <strong>Note:</strong> For shift workers, some variation is expected when switching between day and night shifts. The goal is to maintain consistency within each shift type.
            </p>
          </section>

          {/* Sleep Deficit */}
          <section>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-[12px] font-bold">
                3
              </span>
              Sleep Deficit
            </h3>
            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
              This shows how far behind or ahead you are on your weekly sleep target:
            </p>
            <ul className="space-y-1.5 mb-3 ml-8">
              <li className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span><strong>Positive number:</strong> You&apos;re behind your weekly target (need more sleep)</span>
              </li>
              <li className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span><strong>Negative number:</strong> You&apos;re ahead of your weekly target (sleep surplus)</span>
              </li>
              <li className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span>Calculated from the last 7 days of sleep vs. your weekly target (typically 52.5 hours for 7.5h × 7 days)</span>
              </li>
            </ul>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 italic">
              Categories: <strong>Surplus/Low</strong> (on track), <strong>Medium</strong> (needs attention), <strong>High</strong> (prioritize recovery).
            </p>
          </section>

          {/* AI Suggestions */}
          <section className="pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" strokeWidth={2.5} />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                Personalized Suggestions
              </h3>
            </div>
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="ml-2 text-[13px] text-slate-600 dark:text-slate-300">Generating suggestions...</span>
              </div>
            ) : suggestions ? (
              <div className="bg-gradient-to-br from-indigo-50/50 dark:from-indigo-950/30 to-blue-50/30 dark:to-blue-950/30 rounded-xl p-4 border border-indigo-100/60 dark:border-indigo-800/40">
                <div className="space-y-2">
                  {formatSuggestions(suggestions)}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Unable to load suggestions at this time.</p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-6 pb-6 pt-4 border-t border-slate-100/80 dark:border-slate-700/50 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/50">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 dark:from-indigo-600 dark:via-blue-600 dark:to-indigo-700 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] dark:shadow-[0_4px_12px_rgba(99,102,241,0.5)] transition-all hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)] dark:hover:shadow-[0_6px_16px_rgba(99,102,241,0.6)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    container
  )
}

