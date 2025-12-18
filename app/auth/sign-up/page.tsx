'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Premium Card Container */}
        <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.5)]">
          {/* Premium gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-50/20" />
          
          {/* Enhanced inner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/60" />
          
          <div className="relative z-10 px-8 py-10">
            {/* Logo and Tagline */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Image
                  src="/scpremium-logo.svg"
                  alt="ShiftCoach Logo"
                  width={200}
                  height={50}
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-sm font-medium text-slate-600 mt-3">
                Dedicated to shift worker health and wellbeing.
              </p>
            </div>

            {/* Welcome Text */}
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent mb-6 text-center">
              {showConfirm ? 'Check your email' : 'Create account'}
            </h1>

            {/* Confirmation Message */}
            {showConfirm && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200/50">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-emerald-900 font-semibold text-sm mb-1">
                      Confirmation email sent!
                    </p>
                    <p className="text-emerald-700 text-sm">
                      Please check your email and click the confirmation link to continue. 
                      You'll be redirected to select your plan.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            {!showConfirm && (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <input
                  className="w-full border rounded-xl px-4 py-3.5 bg-white/80 backdrop-blur-sm border-slate-200/60 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <input
                  className="w-full border rounded-xl px-4 py-3.5 bg-white/80 backdrop-blur-sm border-slate-200/60 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <p className="text-xs text-slate-500 mt-1.5 ml-1">Must be at least 6 characters</p>
              </div>
              {err && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200/50">
                  <p className="text-red-600 text-sm font-medium">{err}</p>
                </div>
              )}
              <button
                disabled={busy}
                className="w-full rounded-xl py-3.5 font-semibold text-white bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-600 hover:from-blue-600 hover:via-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)]"
              >
                {busy ? 'Creating…' : 'Sign Up'}
              </button>
              <p className="text-sm text-center text-slate-500 pt-2">
                Already have an account?{' '}
                <Link
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                  href="/auth/sign-in"
                >
                  Sign in
                </Link>
              </p>
            </form>
            )}

            {showConfirm && (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    try again
                  </button>
                </p>
                <Link
                  href="/auth/sign-in"
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
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
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-8 text-center text-sm text-slate-500">
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

