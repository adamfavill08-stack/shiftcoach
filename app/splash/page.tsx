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
    <main className="min-h-screen bg-white flex items-stretch justify-center px-4">
      <div className="w-full max-w-md flex flex-col justify-between py-10">
        {/* Top: logo + headline */}
        <div
          className={`text-center transform transition-all duration-500 ease-out ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="flex justify-center mb-8">
            <Image
              src="/scpremium-logo.svg"
              alt="ShiftCoach"
              width={200}
              height={80}
              className="h-20 w-auto"
              priority
            />
          </div>
          <p className="text-sm sm:text-base font-semibold text-slate-800 tracking-tight leading-relaxed max-w-sm mx-auto">
            The only app dedicated to shift workers&apos; health and wellbeing
          </p>
          <p className="mt-3 text-xs text-slate-500 tracking-tight leading-relaxed max-w-sm mx-auto">
            Built with nurses, paramedics, guards, chefs and operators in mind.
          </p>

          {/* Micro loading cue */}
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-medium">
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
          <Image
            src="/groupsc.png"
            alt="Group of shift workers"
            width={800}
            height={600}
            className="w-full h-auto max-h-[60vh] object-contain"
            priority
          />
        </div>
      </div>
    </main>
  )
}

