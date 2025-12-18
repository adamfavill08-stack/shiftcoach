'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-stretch justify-center px-4">
      <div className="w-full max-w-md flex flex-col justify-between py-10">
        {/* Top: logo + headline */}
        <div
          className={`text-center transform transition-all duration-500 ease-out ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="flex justify-center mb-6">
            <img
              src="/scpremium-logo.svg"
              alt="ShiftCoach"
              className="h-20 w-auto"
            />
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-600 tracking-tight leading-relaxed max-w-xs mx-auto">
            The only app dedicated to shift workers&apos; health and wellbeing
          </p>
          <p className="mt-2 text-[10px] text-slate-500 tracking-tight max-w-xs mx-auto">
            Built with nurses, paramedics, guards, chefs and operators in mind.
          </p>

          {/* Micro loading cue */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Preparing your shift plan…
            </span>
          </div>
        </div>

        {/* Bottom illustration */}
        <div
          className={`mt-10 flex justify-center transition-opacity duration-700 ease-out ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src="/groupsc.png"
            alt="Group of shift workers"
            className="w-full h-auto max-h-[60vh] object-contain"
          />
        </div>
      </div>
    </main>
  )
}

