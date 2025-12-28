'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/components/AuthProvider'

export default function SplashPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (loading) return

    // Trigger entrance animation
    setShowContent(true)

    const timer = setTimeout(() => {
      // Simple routing: send signed-in users to dashboard, others to sign-in
      if (user) {
        router.replace('/dashboard')
      } else {
        router.replace('/auth/sign-in')
      }
    }, 4000) // 4 seconds

    return () => clearTimeout(timer)
  }, [user, loading, router])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 relative overflow-hidden flex items-stretch justify-center px-4">
      {/* Aurora paper background - soft blurred blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-200/20 dark:bg-emerald-500/8 blur-3xl" />
      <div className="pointer-events-none absolute top-24 -right-24 h-96 w-96 rounded-full bg-indigo-200/18 dark:bg-indigo-500/6 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-cyan-200/15 dark:bg-cyan-500/5 blur-3xl" />
      
      <div className="w-full max-w-md flex flex-col justify-between py-10 relative z-10">
        {/* Top: logo + headline */}
        <div
          className={`text-center transform transition-all duration-500 ease-out ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="flex justify-center mb-8">
            <div className="relative group">
              {/* Subtle glow effect */}
              <div className="absolute -inset-2 blur-2xl opacity-0 dark:opacity-20 group-hover:opacity-30 dark:group-hover:opacity-40 transition-opacity duration-300 bg-gradient-to-r from-blue-400/50 via-indigo-400/50 to-purple-400/50 rounded-full" />
              <div className="relative">
                <Image
                  src="/scpremium-logo.svg"
                  alt="ShiftCoach"
                  width={240}
                  height={96}
                  className="h-24 w-auto brightness-110 dark:brightness-0 dark:invert saturate-110 drop-shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)] transition-transform duration-300 group-hover:scale-[1.02]"
                  priority
                />
              </div>
            </div>
          </div>
          <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 tracking-tight leading-relaxed max-w-sm mx-auto">
            The only app dedicated to shift workers&apos; health and wellbeing
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 tracking-tight leading-relaxed max-w-sm mx-auto">
            Built with nurses, paramedics, guards, chefs and operators in mind.
          </p>

          {/* Micro loading cue */}
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse shadow-sm" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-medium">
              Preparing your shift plan…
            </span>
          </div>
        </div>

        {/* Bottom illustration */}
        <div
          className={`mt-12 flex justify-center transition-opacity duration-700 ease-out ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="relative">
            {/* Subtle glow around illustration in dark mode */}
            <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10 blur-2xl rounded-3xl opacity-0 dark:opacity-100 transition-opacity duration-500" />
            <Image
              src="/groupsc.png"
              alt="Group of shift workers"
              width={800}
              height={600}
              className="relative w-full h-auto max-h-[60vh] object-contain drop-shadow-lg dark:drop-shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
              priority
            />
          </div>
        </div>
      </div>
    </main>
  )
}

