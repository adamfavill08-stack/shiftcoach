'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { CompactLanguagePicker } from '@/components/i18n/CompactLanguagePicker'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'

export function resolvePostSignInRoute(profile: { onboarding_completed?: boolean | null } | null): '/dashboard' | '/onboarding' {
  return profile?.onboarding_completed === true ? '/dashboard' : '/onboarding'
}

function SignInContent() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
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

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
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
          .select('onboarding_completed')
          .eq('user_id', u.user.id)
          .single()

        router.replace(resolvePostSignInRoute(profile))
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
    <main className="fixed inset-0 z-0 flex h-[100dvh] max-h-[100dvh] w-full flex-row items-stretch justify-center overflow-hidden overscroll-none bg-[#0a0a0f]">
      <div className="relative flex h-full min-h-0 w-[min(100%,26rem)] shrink-0 flex-col overflow-hidden md:rounded-2xl md:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.85)] md:ring-1 md:ring-white/10">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <Image
            src="/auth-sign-in-background.png"
            alt=""
            fill
            className="object-cover object-left"
            priority
            unoptimized
            sizes="(max-width: 640px) 100vw, 416px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/88" />
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="mb-3 w-full shrink-0 self-start text-left">
            <span
              className="text-lg font-semibold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-xl"
              aria-label={t('welcome.logoAlt')}
            >
              Shift<span className="text-[#05afc5]">Coach</span>
            </span>
          </div>
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden py-1">
            <div className="mb-3 mx-auto flex w-full max-w-[min(100%,22rem)] shrink-0 items-start justify-center gap-2 text-center drop-shadow-[0_1px_10px_rgba(0,0,0,0.55)] sm:mb-4">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#05afc5]" strokeWidth={2.25} aria-hidden />
              <span className="min-w-0 text-center text-[11px] font-semibold uppercase leading-snug tracking-[0.08em] text-[#05afc5] sm:text-xs sm:tracking-[0.06em]">
                {t('upgrade.trustedBy')}
              </span>
            </div>
            {/* Main sign-in card */}
            <div className="mx-auto w-full min-h-0 max-w-md shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)] sm:p-7">
          <div>
            <div className="text-left px-0.5">
              <CompactLanguagePicker
                variant="compact"
                id="sign-in-language"
                onlyWhenDeviceLanguageUnsupported
              />
            </div>

            {/* Welcome Text */}
            <div className="mt-4">
              <p className="text-[18px] font-semibold tracking-tight text-slate-900">
                {t('auth.signIn.title')}
              </p>
            </div>

            <div className="mt-5">
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
              <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
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
                    disabled={busy}
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
                    disabled={busy}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                    disabled={busy}
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
                disabled={busy}
                aria-describedby={err ? signInErrorId : undefined}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white bg-[#05afc5] shadow-[0_10px_26px_-14px_rgba(5,175,197,0.45)] transition hover:bg-[#0499b0] active:bg-[#0489a0] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
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
                    href="/auth/welcome"
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
      </div>
      </div>
    </main>
  )
}

function SignInFallback() {
  const { t } = useTranslation()

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] max-h-[100dvh] w-full flex-row items-stretch justify-center overflow-hidden overscroll-none bg-[#0a0a0f]">
      <div className="relative flex h-full min-h-0 w-[min(100%,26rem)] shrink-0 flex-col overflow-hidden md:rounded-2xl md:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.85)] md:ring-1 md:ring-white/10">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <Image
            src="/auth-sign-in-background.png"
            alt=""
            fill
            className="object-cover object-left"
            priority
            unoptimized
            sizes="(max-width: 640px) 100vw, 416px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/88" />
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-5 py-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 text-center text-sm text-slate-500 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            {t('auth.signIn.loading')}
          </div>
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

