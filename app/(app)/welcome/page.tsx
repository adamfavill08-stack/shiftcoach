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
      <main className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950 flex items-center justify-center px-4 py-8">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Premium Card Container */}
        <div className="relative overflow-hidden rounded-2xl bg-white/90 dark:bg-slate-900/45 backdrop-blur-xl border border-white/90 dark:border-slate-700/40 shadow-[0_8px_24px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.5)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]">
          {/* Premium gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-white/85 dark:to-slate-950/60" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 dark:from-blue-950/20 via-transparent to-indigo-50/20 dark:to-indigo-950/20" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Enhanced inner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/60 dark:ring-slate-600/30" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="pt-10 pb-6 px-6 text-center">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  {/* Subtle glow effect */}
                  <div className="absolute -inset-2 blur-2xl opacity-0 dark:opacity-20 group-hover:opacity-30 dark:group-hover:opacity-40 transition-opacity duration-300 bg-gradient-to-r from-blue-400/50 via-indigo-400/50 to-purple-400/50 rounded-full" />
                  <div className="relative">
                    <Image
                      src="/scnew-logo.svg"
                      alt="ShiftCoach"
                      width={140}
                      height={56}
                      className="h-18 w-auto brightness-[1.15] dark:brightness-0 dark:invert contrast-[1.1] dark:contrast-[1.15] saturate-110 dark:saturate-120 drop-shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)] transition-transform duration-300 group-hover:scale-105"
                      priority
                    />
                  </div>
                </div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 dark:from-slate-100 via-slate-800 dark:via-slate-200 to-slate-900 dark:to-slate-100 bg-clip-text text-transparent mb-1">
                Your plan is ready
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Based on your profile, goals and shift work pattern.
              </p>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-6">
              {/* Magic result */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-50/80 dark:from-blue-950/30 via-indigo-50/70 dark:via-indigo-950/30 to-slate-50/80 dark:to-slate-900/40 border border-blue-100/70 dark:border-blue-800/40 px-5 py-4 shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                <p className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400 uppercase mb-2">
                  Personalised daily target
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                    {loading || adjustedKcal == null
                      ? '—'
                      : adjustedKcal.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    kcal / day
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Based on your height, weight, age, goal and the demands of shift
                  work, this is what ShiftCoach recommends for{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {shiftLabel.toLowerCase()}
                  </span>
                  .
                </p>
                {baseKcal != null && deltaPct != null && (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    A standard calculator would give you around{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {baseKcal.toLocaleString()} kcal
                    </span>
                    . We've adjusted by{' '}
                    <span
                      className={`font-semibold ${
                        deltaPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
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
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40 px-3 py-3 flex flex-col items-start gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-[11px]">
                    Shift‑adjusted calories
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    Built specifically for rotating days, nights and long runs.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40 px-3 py-3 flex flex-col items-start gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-[11px]">
                    Timing aware
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    We nudge more calories into the parts of your shift that need it.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40 px-3 py-3 flex flex-col items-start gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-[11px]">
                    Hydration guidance
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    Daily water targets tuned to long and overnight shifts.
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/40">
                <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-3">
                  Next: see today's plan with meal timing, macros and energy curve.
                </p>
                <button
                  onClick={handleContinue}
                  className="group relative w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white dark:text-slate-900 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-slate-100 dark:to-slate-200 dark:hover:from-slate-200 dark:hover:to-slate-300 shadow-[0_4px_16px_rgba(14,165,233,0.3),0_2px_6px_rgba(99,102,241,0.2),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1)] dark:shadow-[0_10px_26px_-14px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_24px_rgba(14,165,233,0.4),0_4px_12px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_12px_30px_-14px_rgba(255,255,255,0.2)]"
                >
                  {/* Premium shine effect */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-30 dark:opacity-0 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), transparent 60%)',
                    }}
                  />
                  <span className="relative z-10">Continue to dashboard</span>
                  <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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


