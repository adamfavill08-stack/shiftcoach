'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Sparkles } from 'lucide-react'
type SocialJetlagCategory = "low" | "moderate" | "high"

interface SocialJetlagInfoModalProps {
  open: boolean
  onClose: () => void
  currentMisalignmentHours: number
  weeklyAverageMisalignmentHours?: number
  category: SocialJetlagCategory
  baselineMidpointClock?: number
  currentMidpointClock?: number
}

export function SocialJetlagInfoModal({
  open,
  onClose,
  currentMisalignmentHours,
  weeklyAverageMisalignmentHours,
  category,
  baselineMidpointClock,
  currentMidpointClock,
}: SocialJetlagInfoModalProps) {
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
      const res = await fetch('/api/sleep/social-jetlag-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMisalignmentHours,
          weeklyAverageMisalignmentHours,
          category,
          baselineMidpointClock,
          currentMidpointClock,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to fetch suggestions')
      }

      const data = await res.json()
      setSuggestions(data.suggestions || 'No suggestions available at this time.')
    } catch (err) {
      console.error('[SocialJetlagInfoModal] Error fetching suggestions:', err)
      setSuggestions('Unable to load personalized suggestions. Please try again later.')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  if (!open || !container) return null

  const formatSuggestions = (text: string): React.ReactNode => {
    const lines = text.split('\n').filter(line => line.trim())
    const elements: React.ReactNode[] = []
    let currentList: string[] = []
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        currentList.push(trimmed.substring(1).trim())
      } else {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${idx}`} className="space-y-2 mb-3 ml-2">
              {currentList.map((item, i) => (
                <li key={i} className="text-[13px] text-slate-700 leading-relaxed flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
          currentList = []
        }
        if (trimmed) {
          elements.push(
            <p key={`para-${idx}`} className="text-[13px] text-slate-700 leading-relaxed mb-3">
              {trimmed}
            </p>
          )
        }
      }
    })
    
    if (currentList.length > 0) {
      elements.push(
        <ul key="list-final" className="space-y-2 mb-3 ml-2">
          {currentList.map((item, i) => (
            <li key={i} className="text-[13px] text-slate-700 leading-relaxed flex items-start gap-2">
              <span className="text-indigo-500 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    }
    
    return <>{elements}</>
  }

  const formatTime = (hours: number | undefined): string => {
    if (hours === undefined) return '—'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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
        className="relative w-full max-w-md max-h-[90vh] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100/80 bg-gradient-to-b from-white to-slate-50/50">
          <div>
            <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
              Social Jetlag Explained
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Understanding your sleep timing shift
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-600 hover:text-slate-900 transition-all hover:scale-105 active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* What is Social Jetlag */}
          <section>
            <h3 className="text-[15px] font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 text-[12px] font-bold">
                1
              </span>
              What is Social Jetlag?
            </h3>
            <p className="text-[13px] text-slate-700 leading-relaxed mb-3">
              Social jetlag measures how much your current sleep timing has shifted away from your usual sleep pattern. For shift workers, this is especially important because your sleep schedule naturally changes when you switch between day and night shifts.
            </p>
            <p className="text-[12px] text-slate-600 leading-relaxed">
              Unlike regular jetlag from travel, social jetlag happens when your body clock gets out of sync with your usual rhythm due to shift changes, irregular schedules, or lifestyle factors.
            </p>
          </section>

          {/* How it's calculated */}
          <section>
            <h3 className="text-[15px] font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600 text-[12px] font-bold">
                2
              </span>
              How It&apos;s Calculated
            </h3>
            <p className="text-[13px] text-slate-700 leading-relaxed mb-3">
              ShiftCoach calculates social jetlag using your sleep data:
            </p>
            <ul className="space-y-1.5 mb-3 ml-8">
              <li className="text-[12px] text-slate-600 flex items-start gap-2">
                <span className="text-slate-400 mt-1">•</span>
                <span>Groups your sleep by &quot;ShiftCoach days&quot; (07:00 → 07:00, not midnight to midnight)</span>
              </li>
              <li className="text-[12px] text-slate-600 flex items-start gap-2">
                <span className="text-slate-400 mt-1">•</span>
                <span>For each day, calculates your sleep midpoint (halfway between your first sleep start and last sleep end)</span>
              </li>
              <li className="text-[12px] text-slate-600 flex items-start gap-2">
                <span className="text-slate-400 mt-1">•</span>
                <span>Establishes a baseline from the median midpoint of your previous 7-10 stable days</span>
              </li>
              <li className="text-[12px] text-slate-600 flex items-start gap-2">
                <span className="text-slate-400 mt-1">•</span>
                <span>Compares today&apos;s midpoint to your baseline to find the misalignment in hours</span>
              </li>
            </ul>
            {(baselineMidpointClock !== undefined || currentMidpointClock !== undefined) && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <p className="text-[11px] font-semibold text-slate-600 mb-2">Your Current Data:</p>
                <div className="space-y-1 text-[12px] text-slate-700">
                  {baselineMidpointClock !== undefined && (
                    <p>Baseline midpoint: <span className="font-semibold">{formatTime(baselineMidpointClock)}</span></p>
                  )}
                  {currentMidpointClock !== undefined && (
                    <p>Current midpoint: <span className="font-semibold">{formatTime(currentMidpointClock)}</span></p>
                  )}
                  <p>Misalignment: <span className="font-semibold">{currentMisalignmentHours.toFixed(1)} hours</span></p>
                </div>
              </div>
            )}
          </section>

          {/* Score Categories */}
          <section>
            <h3 className="text-[15px] font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 text-[12px] font-bold">
                3
              </span>
              Score Categories
            </h3>
            <ul className="space-y-2 mb-3 ml-8">
              <li className="text-[12px] text-slate-600 flex items-start gap-2">
                <span className="text-emerald-500 mt-1 font-bold">•</span>
                <div>
                  <span className="font-semibold text-slate-900">Low (0-1.5h):</span> Your sleep timing has stayed close to your usual rhythm. This is ideal for maintaining your body clock.
                </div>
              </li>
              <li className="text-[12px] text-slate-600 flex items-start gap-2">
                <span className="text-amber-500 mt-1 font-bold">•</span>
                <div>
                  <span className="font-semibold text-slate-900">Moderate (1.5-3.5h):</span> Your sleep midpoint has shifted noticeably, likely due to recent shift changes. Some adjustment may be needed.
                </div>
              </li>
              <li className="text-[12px] text-slate-600 flex items-start gap-2">
                <span className="text-rose-500 mt-1 font-bold">•</span>
                <div>
                  <span className="font-semibold text-slate-900">High (&gt;3.5h):</span> Your body clock is significantly shifted from your usual pattern. This often happens after switching between day and night shifts.
                </div>
              </li>
            </ul>
            <p className="text-[12px] text-slate-500 italic">
              For shift workers, some variation is normal when switching shifts. The goal is to minimize large swings and help your body adapt more smoothly.
            </p>
          </section>

          {/* AI Suggestions */}
          <section className="pt-4 border-t border-slate-200/60">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-indigo-600" strokeWidth={2.5} />
              <h3 className="text-[15px] font-bold text-slate-900">
                Personalized Suggestions
              </h3>
            </div>
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                <span className="ml-2 text-[13px] text-slate-600">Generating suggestions...</span>
              </div>
            ) : suggestions ? (
              <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/30 rounded-xl p-4 border border-indigo-100/60">
                <div className="space-y-2">
                  {formatSuggestions(suggestions)}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-slate-500">Unable to load suggestions at this time.</p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-6 pb-6 pt-4 border-t border-slate-100/80 bg-gradient-to-b from-transparent to-slate-50/50">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-all hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    container
  )
}

