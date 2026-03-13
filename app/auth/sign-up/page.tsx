'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Mail, Lock } from 'lucide-react'

function SignUpContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('confirm') === 'true') {
      setShowConfirm(true)
    }
  }, [searchParams])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(undefined)
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        // After confirming email, start the user in onboarding to complete their profile
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`
      }
    })
    setBusy(false)
    if (error) return setErr(error.message)
    // Show success message - user needs to confirm email
    setShowConfirm(true)
    setEmail('')
    setPassword('')
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Main sign-up card */}
        <div className="mx-auto max-w-md rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] p-7">
          <div>
            {/* Logo and Tagline */}
            <div className="text-center">
              <div className="flex justify-center">
                <Image
                  src="/scpremium-logo.svg"
                  alt="ShiftCoach Logo"
                  width={200}
                  height={60}
                  className="object-contain h-12"
                  priority
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-700 max-w-[36ch] mx-auto">
                Dedicated to shift worker health and wellbeing.
              </p>
              
              {/* Status pill */}
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Personalized for your shifts
              </span>
            </div>

            {/* Welcome Text */}
            <div className="mt-7">
              <p className="text-[18px] font-semibold tracking-tight text-slate-900">
                {showConfirm ? 'Check your email' : 'Create account'}
              </p>
              {!showConfirm && (
                <p className="mt-1 text-sm text-slate-500">
                  Start your journey to better shift work health.
                </p>
              )}
            </div>

            {/* Confirmation Message */}
            {showConfirm && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-emerald-900 font-semibold text-sm mb-1">
                      Confirmation email sent!
                    </p>
                    <p className="text-emerald-700 text-sm">
                      Please check your email and click the confirmation link to continue. 
                      You'll be redirected to set up your profile.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            {!showConfirm && (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    className="w-full h-12 rounded-xl pl-11 pr-4 bg-white border border-slate-200 placeholder:text-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:border-emerald-400 transition-all text-sm"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    className="w-full h-12 rounded-xl pl-11 pr-4 bg-white border border-slate-200 placeholder:text-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:border-emerald-400 transition-all text-sm"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 ml-1">Must be at least 6 characters</p>
              </div>
              {err && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-red-600 text-sm font-medium">{err}</p>
                </div>
              )}
              <button
                disabled={busy}
                className="w-full h-12 rounded-full text-sm font-semibold text-white bg-slate-900 shadow-[0_10px_26px_-14px_rgba(15,23,42,0.35)] hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Creating…' : 'Sign Up'}
              </button>
              <div className="text-center text-sm pt-2">
                <span className="text-slate-500">
                  Already have an account?{' '}
                  <Link
                    className="text-sm font-semibold text-slate-900 hover:opacity-80 transition-opacity"
                    href="/auth/sign-in"
                  >
                    Sign in
                  </Link>
                </span>
              </div>
            </form>
            )}

            {showConfirm && (
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600 mb-4">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="text-sm font-semibold text-slate-900 hover:opacity-80 transition-opacity"
                  >
                    try again
                  </button>
                </p>
                <Link
                  href="/auth/sign-in"
                  className="text-sm font-semibold text-slate-900 hover:opacity-80 transition-opacity"
                >
                  Already confirmed? Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function SignUp() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md relative z-10">
            <div className="mx-auto max-w-md rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] p-7 text-center text-sm text-slate-500">
              Preparing sign-up…
            </div>
          </div>
        </main>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}

