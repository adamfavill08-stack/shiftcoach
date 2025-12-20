'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Image from 'next/image'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

export default function SelectPlanPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | undefined>()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [promoCode, setPromoCode] = useState('')
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [promoValid, setPromoValid] = useState(false)
  const [promoError, setPromoError] = useState<string | undefined>()

  // In development, allow viewing without auth (for testing)
  const isDev = process.env.NODE_ENV !== 'production'
  
  // Redirect if not authenticated (skip in dev mode for testing)
  useEffect(() => {
    if (!loading && !user && !isDev) {
      router.replace('/auth/sign-in')
    }
  }, [user, loading, router, isDev])

  // Check if user already has a plan selected (skip in dev mode for testing)
  useEffect(() => {
    if (user && !loading && !isDev) {
      // Check if user already selected a plan
      const checkExistingPlan = async () => {
        const { supabase } = await import('@/lib/supabase')
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .single()

        // If plan already selected, skip to onboarding
        if (profile?.subscription_plan) {
          router.replace('/onboarding')
        }
      }
      checkExistingPlan()
    }
  }, [user, loading, router, isDev])

  // Carousel navigation
  const plans = ['monthly', 'yearly'] as const
  
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % plans.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + plans.length) % plans.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextSlide()
    }
    if (isRightSwipe) {
      prevSlide()
    }
  }

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code')
      return
    }

    setValidatingPromo(true)
    setPromoError(undefined)

    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid promo code')
      }

      setPromoValid(true)
      setPromoError(undefined)
    } catch (error: any) {
      setPromoError(error.message || 'Invalid promo code')
      setPromoValid(false)
    } finally {
      setValidatingPromo(false)
    }
  }

  const handleSelectPlan = async () => {
    // If promo code is valid, proceed with free access (skip payment)
    if (promoValid) {
      if (!user && !isDev) return

      setBusy(true)
      setErr(undefined)

      try {
        const response = await fetch('/api/profile/plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plan: 'tester', promoCode: promoCode.trim().toUpperCase() }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save plan selection')
        }

        // Redirect to onboarding (tester codes skip payment)
        router.replace('/onboarding')
      } catch (error: any) {
        setErr(error.message || 'Something went wrong')
        setBusy(false)
      }
      return
    }

    if (!selectedPlan) return

    // Always double-check auth state to be sure
    let finalUser = user
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authUser) {
        finalUser = authUser
      } else if (authError) {
        console.log('[select-plan] Auth check error:', authError)
      }
    } catch (err) {
      console.error('[select-plan] Error checking auth:', err)
    }

    // If still no user, show dev mode message or error
    if (!finalUser) {
      if (isDev) {
        setBusy(true)
        setTimeout(() => {
          alert(`Plan selected: ${selectedPlan}\n\n(In dev mode - not saved. Sign in to actually save.)`)
          setBusy(false)
        }, 500)
        return
      }
      setErr('Please sign in to continue')
      return
    }

    setBusy(true)
    setErr(undefined)

    try {
      // Create Stripe checkout session for payment
      const response = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          plan: selectedPlan,
          // 7-day free trial
          trialDays: 7
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session')
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error: any) {
      setErr(error.message || 'Something went wrong')
      setBusy(false)
    }
  }

  if (loading && !isDev) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950 flex items-center justify-center px-4 py-8">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </main>
    )
  }

  // In production, require authentication
  if (!user && !isDev) {
    return null
  }

  // Show dev mode notice
  if (isDev && !user) {
    // Allow viewing in dev mode for testing
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl">
        {/* Premium Card Container */}
        <div className="relative overflow-hidden rounded-2xl bg-white/90 dark:bg-slate-900/45 backdrop-blur-xl border border-white/90 dark:border-slate-700/40 shadow-[0_8px_24px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.5)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]">
          {/* Premium gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-white/85 dark:to-slate-950/60" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 dark:from-blue-950/20 via-transparent to-indigo-50/20 dark:to-indigo-950/20" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Enhanced inner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/60 dark:ring-slate-600/30" />
          
          <div className="relative z-10 px-8 py-10">
            {/* Logo and Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Image
                  src="/scpremium-logo.svg"
                  alt="ShiftCoach Logo"
                  width={200}
                  height={50}
                  className="object-contain brightness-110 dark:brightness-125"
                  priority
                />
              </div>
              {isDev && !user && (
                <div className="mb-4 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                    🧪 DEV MODE: Testing without authentication
                  </p>
                </div>
              )}
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 dark:from-slate-100 via-slate-800 dark:via-slate-200 to-slate-900 dark:to-slate-100 bg-clip-text text-transparent mb-2">
                Choose Your Plan
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Start your 7-day free trial. Cancel anytime.
              </p>
            </div>

            {/* Pricing Cards Carousel */}
            <div className="relative mb-8">
              {/* Carousel Container */}
              <div
                className="overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {/* Monthly Plan */}
                  <div className="min-w-full px-2">
                    <div
                      onClick={() => setSelectedPlan('monthly')}
                      className={`relative cursor-pointer rounded-2xl border-2 p-8 transition-all ${
                        selectedPlan === 'monthly'
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 shadow-lg dark:shadow-[0_8px_24px_rgba(59,130,246,0.3)] scale-105'
                          : 'border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md dark:hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Monthly</h3>
                        {selectedPlan === 'monthly' && (
                          <div className="w-7 h-7 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">£3.99</span>
                        <span className="text-base font-normal text-slate-500 dark:text-slate-400 ml-2">/ month</span>
                      </div>
                      <p className="text-base text-slate-600 dark:text-slate-300 mb-8">
                        Perfect if you want to try ShiftCoach month to month.
                      </p>
                      <ul className="space-y-3 text-base text-slate-700 dark:text-slate-300">
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Full access to ShiftCoach app</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Body clock & circadian score</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Smart shift & sleep insights</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Rota calendar & events</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Sync across devices</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Cancel anytime</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Yearly Plan */}
                  <div className="min-w-full px-2">
                    <div
                      onClick={() => setSelectedPlan('yearly')}
                      className={`relative cursor-pointer rounded-2xl border-2 p-8 transition-all ${
                        selectedPlan === 'yearly'
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 shadow-lg dark:shadow-[0_8px_24px_rgba(59,130,246,0.3)] scale-105'
                          : 'border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md dark:hover:shadow-lg'
                      }`}
                    >
                      <div className="absolute -top-3 right-6">
                        <span className="bg-blue-500 dark:bg-blue-400 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Best value
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Yearly</h3>
                        {selectedPlan === 'yearly' && (
                          <div className="w-7 h-7 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">£43</span>
                        <span className="text-base font-normal text-slate-500 dark:text-slate-400 ml-2">/ year</span>
                      </div>
                      <p className="text-base text-blue-600 dark:text-blue-400 font-medium mb-2">
                        Save about 10% vs paying monthly (£47.88).
                      </p>
                      <p className="text-base text-slate-600 dark:text-slate-300 mb-8">
                        For serious shift workers ready to commit to better rhythms.
                      </p>
                      <ul className="space-y-3 text-base text-slate-700 dark:text-slate-300">
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Everything in Monthly</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Priority feature access</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Early access to new experiments</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Best long-term value</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all z-10"
                aria-label="Previous plan"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all z-10"
                aria-label="Next plan"
              >
                <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>

              {/* Carousel Indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {plans.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlide === index
                        ? 'w-8 bg-blue-500 dark:bg-blue-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Promo Code Section */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-slate-900/45 px-4 text-slate-500 dark:text-slate-400">or</span>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Have a tester code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase())
                      setPromoValid(false)
                      setPromoError(undefined)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !validatingPromo) {
                        handleValidatePromo()
                      }
                    }}
                    placeholder="Enter tester code"
                    className="flex-1 border rounded-xl px-4 py-3 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={handleValidatePromo}
                    disabled={validatingPromo || !promoCode.trim() || promoValid}
                    className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-600 dark:from-blue-600 dark:via-indigo-600 dark:to-blue-700 hover:from-blue-600 hover:via-indigo-700 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:via-indigo-700 dark:hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(59,130,246,0.3)] dark:shadow-[0_4px_12px_rgba(59,130,246,0.5)]"
                  >
                    {validatingPromo ? 'Checking...' : promoValid ? '✓ Valid' : 'Apply'}
                  </button>
                </div>
                {promoError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{promoError}</p>
                )}
                {promoValid && (
                  <div className="mt-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                      ✓ Tester code accepted! You'll get free access.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {err && (
              <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/40">
                <p className="text-red-600 dark:text-red-300 text-sm font-medium">{err}</p>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={handleSelectPlan}
              disabled={(!selectedPlan && !promoValid) || busy}
              className="w-full rounded-xl py-3.5 font-semibold text-white bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-600 dark:from-blue-600 dark:via-indigo-600 dark:to-blue-700 hover:from-blue-600 hover:via-indigo-700 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:via-indigo-700 dark:hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(59,130,246,0.3)] dark:shadow-[0_4px_12px_rgba(59,130,246,0.5)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_6px_16px_rgba(59,130,246,0.6)]"
            >
              {busy ? 'Processing…' : promoValid ? 'Continue with Free Access' : 'Start 7-Day Free Trial'}
            </button>

            {/* Footer */}
            <p className="mt-6 text-xs text-center text-slate-500 dark:text-slate-400">
              Prices in GBP. Cancel anytime from within the app. No hidden fees.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

