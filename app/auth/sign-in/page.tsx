'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
              Welcome back
            </h1>

            {/* Form */}
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
                  required
                />
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
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm pt-2">
                <Link
                  className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
                  href="/auth/reset"
                >
                  Forgot password?
                </Link>
                <span className="text-slate-500">
                  No account?{' '}
                  <Link
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
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

