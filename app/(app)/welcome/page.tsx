'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle2, Flame, Droplets, Activity } from 'lucide-react'
import { useTodayNutrition } from '@/lib/hooks/useTodayNutrition'

export default function WelcomePage() {
  const router = useRouter()
  const [isValid, setIsValid] = useState(false)
  const { data, loading } = useTodayNutrition()

  useEffect(() => {
    // Check if user came from onboarding
    // Use a small delay to ensure sessionStorage is accessible after navigation
    const checkFlag = () => {
      try {
        const fromOnboarding = sessionStorage.getItem('fromOnboarding')
        console.log('[welcome] fromOnboarding flag:', fromOnboarding)
        if (!fromOnboarding) {
          console.log('[welcome] No flag found, redirecting to dashboard')
          router.replace('/dashboard')
        } else {
          // Flag found - show the page
          console.log('[welcome] Flag found, showing welcome page')
          setIsValid(true)
        }
      } catch (error) {
        console.error('[welcome] Error checking flag:', error)
        // If there's an error accessing sessionStorage, redirect to dashboard
        router.replace('/dashboard')
      }
    }
    
    // Small delay to ensure sessionStorage is ready after navigation
    const timeoutId = setTimeout(checkFlag, 100)
    
    return () => clearTimeout(timeoutId)
  }, [router])

  const handleContinue = () => {
    // Clear the flag when user continues
    try {
      sessionStorage.removeItem('fromOnboarding')
    } catch (error) {
      console.error('[welcome] Error removing flag:', error)
    }
    router.push('/dashboard')
  }

  // Don't render until we've checked the flag
  if (!isValid) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
        <div className="text-slate-500">Loading...</div>
      </main>
    )
  }

  const baseKcal = data?.baseCalories ?? null
  const adjustedKcal = data?.adjustedCalories ?? null
  const deltaPct =
    baseKcal && adjustedKcal
      ? Math.round(((adjustedKcal - baseKcal) / baseKcal) * 100)
      : null

  const shiftLabel =
    data?.shiftType === 'night'
      ? "Tonight's night shift"
      : data?.shiftType === 'off'
      ? 'Today (Day Off)'
      : data?.shiftType === 'day'
      ? "Today's day shift"
      : 'Today'

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Main welcome card */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div>
            {/* Header */}
            <div className="pt-8 pb-5 px-6 text-center border-b border-slate-200/60">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <Image
                  src="/scnew-logo.svg"
                  alt="ShiftCoach"
                  width={140}
                  height={56}
                  className="h-18 w-auto"
                  priority
                />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                Your plan is ready
              </h1>
              <p className="text-sm text-slate-600">
                Based on your profile, goals and shift work pattern.
              </p>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-6">
              {/* Magic result */}
              <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700 mb-2">
                  Personalised daily target
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-slate-900">
                    {loading || adjustedKcal == null
                      ? '—'
                      : adjustedKcal.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-slate-600">
                    kcal / day
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Based on your height, weight, age, goal and the demands of shift
                  work, this is what ShiftCoach recommends for{' '}
                  <span className="font-semibold text-slate-900">
                    {shiftLabel.toLowerCase()}
                  </span>
                  .
                </p>
                {baseKcal != null && deltaPct != null && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    A standard calculator would give you around{' '}
                    <span className="font-semibold text-slate-900">
                      {baseKcal.toLocaleString()} kcal
                    </span>
                    . We've adjusted by{' '}
                    <span
                      className={`font-semibold ${
                        deltaPct >= 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                    </span>{' '}
                    for your sleep, shifts and recent patterns.
                  </p>
                )}
              </div>

              {/* Quick highlights */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-white border border-slate-200 px-3 py-3 flex flex-col items-start gap-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600">
                    <Flame className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-slate-900 text-[11px]">
                    Shift‑adjusted calories
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Built specifically for rotating days, nights and long runs.
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 px-3 py-3 flex flex-col items-start gap-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600">
                    <Activity className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-slate-900 text-[11px]">
                    Timing aware
                  </p>
                  <p className="text-[10px] text-slate-600">
                    We nudge more calories into the parts of your shift that need it.
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 px-3 py-3 flex flex-col items-start gap-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-600">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-slate-900 text-[11px]">
                    Hydration guidance
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Daily water targets tuned to long and overnight shifts.
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              <div className="pt-3 border-top border-slate-200/60">
                <p className="text-xs text-center text-slate-500 mb-3">
                  Next: see today's plan with meal timing, macros and energy curve.
                </p>
                <button
                  onClick={handleContinue}
                  className="group relative w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-slate-900 shadow-[0_10px_26px_-14px_rgba(15,23,42,0.35)] hover:opacity-95 active:scale-[0.98] transition-all"
                >
                  <span>Continue to dashboard</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}


