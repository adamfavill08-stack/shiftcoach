'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
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

export type SignUpFormFieldsProps = {
  /** Called after successful email sign-up (after optional sign-out) and before `onSuccess`. Use to persist onboarding draft, etc. */
  persistDraft?: () => void
  onSuccess: () => void
  signInHref?: string
  /** Persist draft before leaving for OAuth. */
  onBeforeOAuth?: () => void
  /** When false, hide Google / other OAuth (e.g. compact onboarding card). */
  showSocialAuth?: boolean
}

export function SignUpFormFields({
  persistDraft,
  onSuccess,
  signInHref = '/auth/sign-in',
  onBeforeOAuth,
  showSocialAuth = true,
}: SignUpFormFieldsProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const { isOnline } = useNetworkStatus()
  const formDisabled = busy || (showSocialAuth && oauthBusy)
  const passwordStrength = useMemo(() => computePasswordStrength(password), [password])
  const passwordHintId = 'sign-up-password-hint'
  const passwordStrengthId = 'sign-up-password-strength'

  const submit = async (e: FormEvent) => {
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

    persistDraft?.()
    setBusy(false)
    onSuccess()
  }

  return (
    <div>
      {showSocialAuth && (
        <SocialAuthButtons
          disabled={busy || oauthBusy}
          isOnline={isOnline}
          onError={setErr}
          onPendingChange={setOauthBusy}
          onBeforeOAuth={onBeforeOAuth ?? persistDraft}
        />
      )}
      {err && (
        <div
          className={`rounded-xl border border-red-200 bg-red-50 p-3 ${showSocialAuth ? 'mt-4' : ''}`}
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-medium text-red-600">{err}</p>
        </div>
      )}
      {showSocialAuth && <AuthEmailDivider />}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              placeholder={t('auth.signUp.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={formDisabled}
              required
            />
          </div>
        </div>
        <div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-12 w-full rounded-xl border border-slate-200 bg-white py-0 pl-11 pr-12 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              placeholder={t('auth.signUp.password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={formDisabled}
              minLength={6}
              required
              aria-describedby={
                password ? `${passwordHintId} ${passwordStrengthId}` : passwordHintId
              }
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              disabled={formDisabled}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.password.hide') : t('auth.password.show')}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          <p id={passwordHintId} className="ml-1 mt-1.5 text-xs text-slate-500">
            {t('auth.signUp.passwordHint')}
          </p>
          {password.length > 0 && (
            <div id={passwordStrengthId} className="ml-1 mt-2 space-y-1.5" aria-live="polite">
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
                {[0, 1, 2].map((i) => {
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
          disabled={formDisabled}
          className="h-12 w-full rounded-full bg-slate-900 text-sm font-semibold text-white shadow-[0_10px_26px_-14px_rgba(15,23,42,0.35)] transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? t('auth.signUp.busy') : t('auth.signUp.submit')}
        </button>
        <div className="pt-2 text-center text-sm">
          <span className="text-slate-500">
            {t('auth.signUp.hasAccount')}{' '}
            <Link
              className="text-sm font-semibold text-slate-900 transition-opacity hover:opacity-80"
              href={signInHref}
              onClick={() => persistDraft?.()}
            >
              {t('auth.signUp.signIn')}
            </Link>
          </span>
        </div>
      </form>
    </div>
  )
}
