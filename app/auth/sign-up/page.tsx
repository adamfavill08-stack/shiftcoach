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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/select-plan`
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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 relative overflow-hidden flex items-center justify-center px-6 py-12">
      {/* Soft aurora blobs - very subtle */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/18 dark:bg-emerald-500/8 blur-3xl" />
      <div className="pointer-events-none absolute top-24 -right-24 h-72 w-72 rounded-full bg-indigo-200/15 dark:bg-indigo-500/6 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-cyan-200/12 dark:bg-cyan-500/5 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Glass sheet card */}
        <div className="relative mx-auto max-w-md rounded-3xl overflow-hidden bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_50px_-22px_rgba(0,0,0,0.18)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_18px_50px_-22px_rgba(0,0,0,0.5)] p-7">
          {/* Glass highlight overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/70 via-transparent to-transparent" />
          
          <div className="relative z-10">
            {/* Logo and Tagline */}
            <div className="text-center">
              <div className="flex justify-center">
                <Image
                  src="/scpremium-logo.svg"
                  alt="ShiftCoach Logo"
                  width={240}
                  height={60}
                  className="object-contain h-14 brightness-110 dark:brightness-0 dark:invert saturate-110"
                  priority
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-[36ch] mx-auto">
                Dedicated to shift worker health and wellbeing.
              </p>
              
              {/* CalAI magic: OS-like status pill */}
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/40 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 dark:bg-emerald-400/60" />
                Personalized for your shifts
              </span>
            </div>

            {/* Welcome Text - calmer hierarchy */}
            <div className="mt-7">
              <p className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {showConfirm ? 'Check your email' : 'Create account'}
              </p>
              {!showConfirm && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Start your journey to better shift work health.
                </p>
              )}
            </div>

            {/* Confirmation Message */}
            {showConfirm && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-emerald-900 dark:text-emerald-200 font-semibold text-sm mb-1">
                      Confirmation email sent!
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300 text-sm">
                      Please check your email and click the confirmation link to continue. 
                      You'll be redirected to select your plan.
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
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    className="w-full h-12 rounded-2xl pl-11 pr-4 bg-white/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50 dark:focus-visible:ring-slate-600/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
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
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    className="w-full h-12 rounded-2xl pl-11 pr-4 bg-white/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50 dark:focus-visible:ring-slate-600/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 ml-1">Must be at least 6 characters</p>
              </div>
              {err && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/40">
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium">{err}</p>
                </div>
              )}
              <button
                disabled={busy}
                className="w-full h-12 rounded-2xl text-sm font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.35)] dark:shadow-[0_18px_40px_-22px_rgba(255,255,255,0.1)] hover:opacity-95 dark:hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Creating…' : 'Sign Up'}
              </button>
              <div className="text-center text-sm pt-2">
                <span className="text-slate-500 dark:text-slate-400">
                  Already have an account?{' '}
                  <Link
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:opacity-80 transition-opacity"
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
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:opacity-80 transition-opacity"
                  >
                    try again
                  </button>
                </p>
                <Link
                  href="/auth/sign-in"
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:opacity-80 transition-opacity"
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
        <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 relative overflow-hidden flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md relative z-10">
            <div className="relative mx-auto max-w-md rounded-3xl overflow-hidden bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_50px_-22px_rgba(0,0,0,0.18)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_18px_50px_-22px_rgba(0,0,0,0.5)] p-7 text-center text-sm text-slate-500 dark:text-slate-400">
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

