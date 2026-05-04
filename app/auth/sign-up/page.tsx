'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { CompactLanguagePicker } from '@/components/i18n/CompactLanguagePicker'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { AuthEmailDivider, SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { buildEmailConfirmationRedirectTo } from '@/lib/auth/oauthRedirect'

type PasswordStrength = 'none' | 'weak' | 'medium' | 'strong'

function computePasswordStrength(password: string): PasswordStrength {
  if (!password) return 'none'
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 2) return 'weak'
  if (score === 3) return 'medium'
  return 'strong'
}

function SignUpContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const { isOnline } = useNetworkStatus()
  const passwordStrength = useMemo(() => computePasswordStrength(password), [password])
  const passwordHintId = 'sign-up-password-hint'
  const passwordStrengthId = 'sign-up-password-strength'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(undefined)

    const emailRedirectTo = buildEmailConfirmationRedirectTo()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: emailRedirectTo ? { emailRedirectTo } : {},
    })
    void data

    if (error) {
      setBusy(false)
      return setErr(error.message)
    }

    if (data.session) {
      await supabase.auth.signOut()
    }

    setBusy(false)
    router.replace('/auth/sign-in?account_created=1')
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mx-auto max-w-md rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] p-7">
          <div>
            <div className="text-center">
              <div className="flex justify-center">
                <Image
                  src="/logo.svg"
                  alt="ShiftCoach Logo"
                  width={220}
                  height={110}
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
                  id="sign-up-language"
                  onlyWhenDeviceLanguageUnsupported
                />
              </div>
            </div>

            <div className="mt-7">
              <p className="text-[18px] font-semibold tracking-tight text-slate-900">
                {t('auth.signUp.title')}
              </p>
              <p className="mt-1 text-sm text-slate-500">{t('auth.signUp.subtitle')}</p>
            </div>

            <div className="mt-6">
              <SocialAuthButtons
                disabled={busy || oauthBusy}
                isOnline={isOnline}
                onError={setErr}
                onPendingChange={setOauthBusy}
              />
              {err && (
                <div
                  className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200"
                  role="alert"
                  aria-live="assertive"
                >
                  <p className="text-red-600 text-sm font-medium">{err}</p>
                </div>
              )}
              <AuthEmailDivider />
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      className="w-full h-12 rounded-xl pl-11 pr-4 bg-white border border-slate-200 placeholder:text-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:border-emerald-400 transition-all text-sm"
                      placeholder={t('auth.signUp.email')}
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={busy || oauthBusy}
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      className="w-full h-12 rounded-xl pl-11 pr-12 bg-white border border-slate-200 placeholder:text-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:border-emerald-400 transition-all text-sm"
                      placeholder={t('auth.signUp.password')}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={busy || oauthBusy}
                      minLength={6}
                      required
                      aria-describedby={
                        password ? `${passwordHintId} ${passwordStrengthId}` : passwordHintId
                      }
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
                  <p id={passwordHintId} className="text-xs text-slate-500 mt-1.5 ml-1">
                    {t('auth.signUp.passwordHint')}
                  </p>
                  {password.length > 0 && (
                    <div id={passwordStrengthId} className="mt-2 ml-1 space-y-1.5" aria-live="polite">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500">{t('auth.signUp.passwordStrengthLabel')}</span>
                        <span
                          className={
                            passwordStrength === 'weak'
                              ? 'font-medium text-amber-600'
                              : passwordStrength === 'medium'
                                ? 'font-medium text-amber-700'
                                : 'font-medium text-emerald-700'
                          }
                        >
                          {passwordStrength === 'weak'
                            ? t('auth.signUp.passwordStrengthWeak')
                            : passwordStrength === 'medium'
                              ? t('auth.signUp.passwordStrengthMedium')
                              : t('auth.signUp.passwordStrengthStrong')}
                        </span>
                      </div>
                      <div className="flex h-1 gap-1" role="presentation">
                        {[0, 1, 2].map(i => {
                          const active =
                            passwordStrength === 'strong'
                              ? i <= 2
                              : passwordStrength === 'medium'
                                ? i <= 1
                                : passwordStrength === 'weak' && i === 0
                          const barClass =
                            passwordStrength === 'weak'
                              ? active
                                ? 'bg-amber-500'
                                : 'bg-slate-200'
                              : passwordStrength === 'medium'
                                ? active
                                  ? 'bg-amber-500'
                                  : 'bg-slate-200'
                                : active
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-200'
                          return (
                            <span
                              key={i}
                              className={`h-full min-w-0 flex-1 rounded-full transition-colors ${barClass}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  disabled={busy || oauthBusy}
                  className="w-full h-12 rounded-full text-sm font-semibold text-white bg-slate-900 shadow-[0_10px_26px_-14px_rgba(15,23,42,0.35)] hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? t('auth.signUp.busy') : t('auth.signUp.submit')}
                </button>
                <div className="text-center text-sm pt-2">
                  <span className="text-slate-500">
                    {t('auth.signUp.hasAccount')}{' '}
                    <Link
                      className="text-sm font-semibold text-slate-900 hover:opacity-80 transition-opacity"
                      href="/auth/sign-in"
                    >
                      {t('auth.signUp.signIn')}
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

function SignUpFallback() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md relative z-10">
        <div className="mx-auto max-w-md rounded-xl bg-white border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)] p-7 text-center text-sm text-slate-500">
          {t('auth.signUp.loading')}
        </div>
      </div>
    </main>
  )
}

export default function SignUp() {
  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpContent />
    </Suspense>
  )
}
