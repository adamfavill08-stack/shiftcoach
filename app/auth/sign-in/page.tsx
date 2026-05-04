'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { CompactLanguagePicker } from '@/components/i18n/CompactLanguagePicker'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { AuthEmailDivider, SocialAuthButtons } from '@/components/auth/SocialAuthButtons'

function SignInContent() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [emailConfirmedBanner, setEmailConfirmedBanner] = useState(false)
  const [accountCreatedBanner, setAccountCreatedBanner] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isOnline } = useNetworkStatus()
  const emailInputId = 'sign-in-email'
  const passwordInputId = 'sign-in-password'
  const signInErrorId = 'sign-in-error'
  const signInStatusId = 'sign-in-status'

  // Check for error messages from callback redirect
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setErr(decodeURIComponent(errorParam))
      // Clean up URL
      router.replace('/auth/sign-in', { scroll: false })
      return
    }
    if (searchParams.get('email_confirmed') === '1') {
      setEmailConfirmedBanner(true)
      router.replace('/auth/sign-in', { scroll: false })
      return
    }
    if (searchParams.get('account_created') === '1') {
      setAccountCreatedBanner(true)
      router.replace('/auth/sign-in', { scroll: false })
    }
  }, [searchParams, router])

  // Verify Supabase connection on mount (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        console.error('[sign-in] Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
        setErr(t('auth.signIn.configError'))
      } else {
        console.log('[sign-in] Supabase URL configured:', supabaseUrl)
      }
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOnline) {
      setErr('You are offline. Reconnect to sign in.')
      return
    }
    setBusy(true)
    setErr(undefined)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        setBusy(false)
        // Provide user-friendly error messages
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('Email not confirmed')) {
          return setErr(t('auth.signIn.errorInvalid'))
        }
        if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
          return setErr(t('auth.signIn.errorNetwork'))
        }
        return setErr(error.message || t('auth.signIn.errorGeneric'))
      }
      
      // After sign-in, decide whether to send user to onboarding or straight to dashboard
      const { data: u } = await supabase.auth.getUser()
      if (u.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, height_cm, weight_kg')
          .eq('user_id', u.user.id)
          .single()

        // If basic profile fields are missing, guide user through onboarding first
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
        setErr(t('auth.signIn.errorConnect'))
      } else if (err?.message?.includes('Failed to fetch') || 
                 err?.message?.includes('NetworkError') ||
                 err?.name === 'NetworkError') {
        setErr(t('auth.signIn.errorNetwork'))
      } else {
        setErr(err?.message || t('auth.signIn.errorUnexpected'))
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Main sign-in card */}
        <div className="mx-auto max-w-md rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] p-7">
          <div>
            {/* Logo and Tagline */}
            <div className="text-center">
              <div className="flex justify-center">
                <Image
                  src="/logo.svg"
                  alt="ShiftCoach Logo"
                  width={220}
                  height={110}
                  // Logo SVG is authored in black; invert in dark mode.
                  className="h-12 w-auto max-w-full object-contain dark:[filter:invert(1)]"
                  priority
                  unoptimized
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-700 max-w-[36ch] mx-auto">
                {t('auth.tagline')}
              </p>

              <div className="mt-5 text-left px-0.5">
                <CompactLanguagePicker
                  variant="compact"
                  id="sign-in-language"
                  onlyWhenDeviceLanguageUnsupported
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mt-7">
              <p className="text-[18px] font-semibold tracking-tight text-slate-900">
                {t('auth.signIn.title')}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {t('auth.signIn.subtitle')}
              </p>
            </div>

            <div className="mt-6">
              <SocialAuthButtons
                disabled={busy || oauthBusy}
                isOnline={isOnline}
                onError={setErr}
                onPendingChange={setOauthBusy}
                googleOnly
              />
              {emailConfirmedBanner && (
                <div
                  className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-emerald-800 text-sm font-medium">{t('auth.signIn.emailConfirmedNotice')}</p>
                </div>
              )}
              {accountCreatedBanner && (
                <div
                  className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-emerald-800 text-sm font-medium">
                    {t('auth.signIn.accountCreatedNotice')}
                  </p>
                </div>
              )}
              {err && (
                <div id={signInErrorId} className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200" role="alert" aria-live="assertive">
                  <p className="text-red-600 text-sm font-medium">{err}</p>
                </div>
              )}
              <AuthEmailDivider />
              <form onSubmit={submit} className="space-y-4" aria-busy={busy || oauthBusy}>
              <p id={signInStatusId} className="sr-only" aria-live="polite" role="status">
                {busy ? t('auth.signIn.busy') : ''}
              </p>
              <div>
                <label htmlFor={emailInputId} className="sr-only">
                  {t('auth.signIn.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id={emailInputId}
                    className="w-full h-12 rounded-xl pl-11 pr-4 bg-white border border-slate-200 placeholder:text-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:border-emerald-400 transition-all text-sm"
                    placeholder={t('auth.signIn.email')}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={busy || oauthBusy}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor={passwordInputId} className="sr-only">
                  {t('auth.signIn.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id={passwordInputId}
                    className="w-full h-12 rounded-xl pl-11 pr-12 bg-white border border-slate-200 placeholder:text-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:border-emerald-400 transition-all text-sm"
                    placeholder={t('auth.signIn.password')}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={busy || oauthBusy}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                    disabled={busy || oauthBusy}
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? t('auth.password.hide') : t('auth.password.show')}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
              <button
                disabled={busy || oauthBusy}
                aria-describedby={err ? signInErrorId : undefined}
                className="w-full h-12 rounded-full text-sm font-semibold text-white bg-slate-900 shadow-[0_10px_26px_-14px_rgba(15,23,42,0.35)] hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? t('auth.signIn.busy') : t('auth.signIn.submit')}
              </button>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm pt-2">
                <Link
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  href="/auth/reset"
                >
                  {t('auth.signIn.forgotPassword')}
                </Link>
                <span className="text-sm text-slate-500">
                  {t('auth.signIn.noAccount')}{' '}
                  <Link
                    className="text-sm font-semibold text-slate-900 hover:opacity-80 transition-opacity"
                    href="/auth/sign-up"
                  >
                    {t('auth.signIn.createOne')}
                  </Link>
                </span>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function SignInFallback() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md relative z-10">
        <div className="mx-auto max-w-md rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] p-7 text-center text-sm text-slate-500">
          {t('auth.signIn.loading')}
        </div>
      </div>
    </main>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  )
}

