'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Image from 'next/image'
import { CheckCircle2, Loader2 } from 'lucide-react'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (processing) {
        console.error('[payment/success] Verification timeout')
        setError('Verification is taking too long. Please check your subscription status in settings.')
        setProcessing(false)
      }
    }, 30000) // 30 second timeout

    if (!sessionId) {
      console.error('[payment/success] No session_id in URL')
      setError('No payment session found. Please try selecting a plan again.')
      setProcessing(false)
      return () => clearTimeout(timeout)
    }

    // Wait a bit for auth to load, but don't block on it
    // The API route will handle authentication server-side
    const verifyPayment = async () => {
      // Give auth a moment to load (max 3 seconds)
      let attempts = 0
      const maxAttempts = 6 // 6 attempts * 500ms = 3 seconds
      
      const tryVerify = async () => {
        try {
          console.log('[payment/success] Verifying payment with sessionId:', sessionId)
          const response = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          })

          const data = await response.json()
          console.log('[payment/success] Verification response:', { status: response.status, data })

          if (!response.ok) {
            // If unauthorized, wait a bit and retry (auth might still be loading)
            if (response.status === 401 && attempts < maxAttempts) {
              attempts++
              console.log(`[payment/success] Auth not ready, retrying... (${attempts}/${maxAttempts})`)
              setTimeout(tryVerify, 500)
              return
            }
            const errorMsg = data?.error || data?.message || 'Payment verification failed'
            throw new Error(errorMsg)
          }

          // Payment verified, update user plan and redirect to onboarding
          setProcessing(false)
          clearTimeout(timeout)
          
          // Small delay to show success message
          setTimeout(() => {
            router.replace('/onboarding')
          }, 2000)
        } catch (error: any) {
          // If it's a retryable auth error and we haven't maxed out, retry
          if (error.message?.includes('Unauthorized') && attempts < maxAttempts) {
            attempts++
            console.log(`[payment/success] Auth error, retrying... (${attempts}/${maxAttempts})`)
            setTimeout(tryVerify, 500)
            return
          }
          
          console.error('[payment/success] Error:', error)
          const errorMsg = error?.message || error?.toString() || 'Failed to verify payment'
          setError(errorMsg)
          setProcessing(false)
          clearTimeout(timeout)
        }
      }

      // Start verification (will retry if auth not ready)
      tryVerify()
    }

    // Start verification after a short delay to allow auth to initialize
    const startDelay = setTimeout(() => {
      verifyPayment()
    }, 500)

    return () => {
      clearTimeout(timeout)
      clearTimeout(startDelay)
    }
  }, [sessionId, router, processing])

  if (loading || processing) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Verifying your payment...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Error</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => router.replace('/select-plan')}
              className="w-full rounded-xl py-3 font-semibold text-white bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-600 hover:from-blue-600 hover:via-indigo-700 hover:to-blue-700 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <div className="relative z-10 px-8 py-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent mb-2">
              Payment Successful!
            </h1>
            <p className="text-sm text-slate-600 mb-6">
              Your subscription is now active. Redirecting to setup...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Preparing payment success…</p>
          </div>
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}

