'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Mail, Lock } from 'lucide-react'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  // Verify Supabase connection on mount (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        console.error('[sign-in] Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
        setErr('Configuration error: Supabase URL is missing. Please check your .env.local file.')
      } else {
        console.log('[sign-in] Supabase URL configured:', supabaseUrl)
      }
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(undefined)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        setBusy(false)
        // Provide user-friendly error messages
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('Email not confirmed')) {
          return setErr('Invalid email or password. Please check your credentials and try again.')
        }
        if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
          return setErr('Network error. Please check your internet connection and try again.')
        }
        return setErr(error.message || 'An error occurred during sign in. Please try again.')
      }
      
      // Check if profile is complete
      const { data: u } = await supabase.auth.getUser()
      if (u.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, height_cm, weight_kg')
          .eq('user_id', u.user.id)
          .single()
        
        const isComplete = profile && profile.name && profile.height_cm && profile.weight_kg
        router.replace(isComplete ? '/dashboard' : '/onboarding')
      } else {
        router.replace('/dashboard')
      }
    } catch (err: any) {
      // Catch network errors and other unexpected errors
      setBusy(false)
      console.error('[sign-in] Unexpected error:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        error: err,
      })
      
      // Handle "Failed to fetch" TypeError (network/CORS issues)
      if (err?.name === 'TypeError' && 
          (err?.message?.includes('Failed to fetch') || 
           err?.message?.includes('fetch') ||
           !err?.message)) {
        setErr('Unable to connect to the server. Please check your internet connection and ensure Supabase is reachable.')
      } else if (err?.message?.includes('Failed to fetch') || 
                 err?.message?.includes('NetworkError') ||
                 err?.name === 'NetworkError') {
        setErr('Network error. Please check your internet connection and try again.')
      } else {
        setErr(err?.message || 'An unexpected error occurred. Please try again.')
      }
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden flex items-center justify-center px-6 py-12">
      {/* Soft aurora blobs - very subtle */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/18 blur-3xl" />
      <div className="pointer-events-none absolute top-24 -right-24 h-72 w-72 rounded-full bg-indigo-200/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-cyan-200/12 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Glass sheet card */}
        <div className="relative mx-auto max-w-md rounded-3xl overflow-hidden bg-white/75 backdrop-blur-xl border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_50px_-22px_rgba(0,0,0,0.18)] p-7">
          {/* Glass highlight overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 via-transparent to-transparent" />
          
          <div className="relative z-10">
            {/* Logo and Tagline */}
            <div className="text-center">
              <div className="flex justify-center">
                <Image
                  src="/scpremium-logo.svg"
                  alt="ShiftCoach Logo"
                  width={240}
                  height={60}
                  className="object-contain h-14"
                  priority
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 max-w-[36ch] mx-auto">
                Dedicated to shift worker health and wellbeing.
              </p>
              
              {/* CalAI magic: OS-like status pill */}
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-slate-50/60 border border-slate-200/50 text-[11px] text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                Personalized for your shifts
              </span>
            </div>

            {/* Welcome Text - calmer hierarchy */}
            <div className="mt-7">
              <p className="text-[18px] font-semibold tracking-tight text-slate-900">
                Welcome back
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to continue your plan.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    className="w-full h-12 rounded-2xl pl-11 pr-4 bg-white/70 border border-slate-200/60 placeholder:text-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
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
                    className="w-full h-12 rounded-2xl pl-11 pr-4 bg-white/70 border border-slate-200/60 placeholder:text-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {err && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200/50">
                  <p className="text-red-600 text-sm font-medium">{err}</p>
                </div>
              )}
              <button
                disabled={busy}
                className="w-full h-12 rounded-2xl text-sm font-semibold text-white bg-slate-900 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.35)] hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm pt-2">
                <Link
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  href="/auth/reset"
                >
                  Forgot password?
                </Link>
                <span className="text-sm text-slate-500">
                  No account?{' '}
                  <Link
                    className="text-sm font-semibold text-slate-900 hover:opacity-80 transition-opacity"
                    href="/auth/sign-up"
                  >
                    Create one
                  </Link>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}

