'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { ShiftLagLevel } from '@/lib/shiftlag/calculateShiftLag'

interface ShiftLagInfoModalProps {
  open: boolean
  onClose: () => void
  level?: ShiftLagLevel
  score?: number
}

export function ShiftLagInfoModal({ open, onClose, level, score }: ShiftLagInfoModalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.getElementById('phone-root') || document.body
    setContainer(el)
  }, [])

  useEffect(() => {
    if (open) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || !container) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[28px] border border-white dark:border-slate-700/40 shadow-[0_24px_60px_rgba(15,23,42,0.25)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)] max-h-[90vh] overflow-hidden">
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-white/85 dark:to-slate-950/60" />
        
        {/* Inner ring for premium feel */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
        
        {/* Content */}
        <div className="relative z-10 overflow-y-auto max-h-[90vh]">
          {/* Header */}
          <div className="sticky top-0 bg-white/95 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/50 px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                ShiftLag Explained
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                Understanding your shift work impact
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all hover:scale-105 active:scale-95"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {/* What is ShiftLag */}
            <section>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-3">
                What is ShiftLag?
              </h3>
              <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                ShiftLag is your "jet lag" score for shift work. It measures how out-of-sync your body clock is with your work and sleep schedule. Just like traveling across time zones disrupts your rhythm, working nights, early mornings, or rotating shifts creates a similar effect.
              </p>
              <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                Your score ranges from <span className="font-semibold">0-100</span>, where lower is better. A score of 0-20 is <span className="font-semibold text-emerald-600 dark:text-emerald-400">Low</span>, 21-50 is <span className="font-semibold text-amber-600 dark:text-amber-400">Moderate</span>, and 51-100 is <span className="font-semibold text-rose-600 dark:text-rose-400">High</span>.
              </p>
            </section>

            {/* How it's calculated */}
            <section>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-3">
                How It's Calculated
              </h3>
              <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                Your ShiftLag score combines three factors:
              </p>
              <div className="space-y-3">
                <div className="rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400" />
                    <h4 className="text-[13px] font-bold text-red-900 dark:text-red-300">Sleep Debt (0-40 points)</h4>
                  </div>
                  <p className="text-[12px] text-red-800 dark:text-red-300 leading-relaxed">
                    Calculates how many hours of sleep you've missed over the last 7 days compared to your typical sleep need. Higher debt = higher score.
                  </p>
                </div>
                
                <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                    <h4 className="text-[13px] font-bold text-amber-900 dark:text-amber-300">Circadian Misalignment (0-40 points)</h4>
                  </div>
                  <p className="text-[12px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    Measures how many hours of your recent shifts overlap with your biological night (when your body expects to sleep). Night shifts during biological night = higher score.
                  </p>
                </div>
                
                <div className="rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-2 w-2 rounded-full bg-purple-500 dark:bg-purple-400" />
                    <h4 className="text-[13px] font-bold text-purple-900 dark:text-purple-300">Schedule Instability (0-20 points)</h4>
                  </div>
                  <p className="text-[12px] text-purple-800 dark:text-purple-300 leading-relaxed">
                    Tracks how much your shift start times vary. Big jumps between morning, day, and night shifts = higher score. Consistent timing = lower score.
                  </p>
                </div>
              </div>
            </section>

            {/* Effects on body and mind */}
            <section>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-3">
                Effects on Your Body & Mind
              </h3>
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/40 p-3.5">
                  <h4 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-2">Physical Effects</h4>
                  <ul className="text-[12px] text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                    <li>Fatigue and reduced energy levels</li>
                    <li>Digestive issues and appetite changes</li>
                    <li>Weakened immune system</li>
                    <li>Increased risk of metabolic disorders</li>
                    <li>Hormonal imbalances (cortisol, melatonin)</li>
                  </ul>
                </div>
                
                <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/40 p-3.5">
                  <h4 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-2">Mental Effects</h4>
                  <ul className="text-[12px] text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                    <li>Brain fog and difficulty concentrating</li>
                    <li>Mood swings and irritability</li>
                    <li>Increased stress and anxiety</li>
                    <li>Memory and decision-making challenges</li>
                    <li>Reduced alertness and reaction time</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Tips to improve */}
            <section>
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-3">
                Tips to Improve Your ShiftLag Score
              </h3>
              <div className="space-y-2.5">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">1</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">Prioritize Sleep Recovery</h4>
                    <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      After night shifts, treat your daytime sleep like nighttime sleep. Use blackout curtains, eye masks, and keep the room cool and quiet. Aim for 7-9 hours consistently.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">2</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">Stabilize Your Schedule</h4>
                    <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      If possible, work the same shift type for longer blocks (e.g., 2-3 weeks of nights) rather than rapidly rotating. This gives your body clock time to adjust.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">3</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">Use Strategic Naps</h4>
                    <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      Short naps (20-30 min) before night shifts can boost alertness. Avoid long naps that interfere with your main sleep window.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">4</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">Time Light Exposure</h4>
                    <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      Get bright light during your "day" (even if it's nighttime for you). Use blue light blockers 2-3 hours before your main sleep.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">5</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">Manage Caffeine & Meals</h4>
                    <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      Avoid caffeine in the second half of your shift. Eat your largest meal during your "day" and keep meals light near your biological night.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Current score context */}
            {score !== undefined && level && (
              <section className="rounded-xl bg-gradient-to-br from-slate-50 dark:from-slate-800/50 to-slate-100/80 dark:to-slate-900/50 border border-slate-200/60 dark:border-slate-700/40 p-4">
                <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Your Current Score: {score}/100 ({level.charAt(0).toUpperCase() + level.slice(1)})
                </h3>
                {level === 'low' && (
                  <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    Great work! Your body clock is coping well with your current schedule. Keep maintaining consistent sleep and shift patterns.
                  </p>
                )}
                {level === 'moderate' && (
                  <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    You're carrying some shift lag. Focus on improving sleep recovery and stabilizing your schedule where possible. Small changes can make a big difference.
                  </p>
                )}
                {level === 'high' && (
                  <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    Your body clock is significantly disrupted. Prioritize sleep recovery, consider longer shift blocks if possible, and use the tips above to gradually improve your score.
                  </p>
                )}
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/70 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-700/50 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full rounded-full bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-100 dark:to-slate-200 text-white dark:text-slate-900 px-6 py-3 text-[13px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg dark:shadow-[0_10px_26px_-14px_rgba(255,255,255,0.1)] hover:shadow-xl dark:hover:shadow-[0_10px_26px_-14px_rgba(255,255,255,0.15)]"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, container)
}

