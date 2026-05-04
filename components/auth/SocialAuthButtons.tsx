'use client'

import { useCallback, useRef, useState, type ComponentType } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { buildOAuthRedirectTo } from '@/lib/auth/oauthRedirect'
import { getSupabaseGoogleOAuthCallbackUrl } from '@/lib/auth/supabaseGoogleOAuth'
import { useTranslation } from '@/components/providers/language-provider'

const AUTH_OAUTH_CONTINUE_PATH = '/auth/oauth-continue'
const OAUTH_NEXT_COOKIE_NAME = 'oauth_next'

function setOAuthNextCookie(nextPath: string) {
  // Used so our server-side `/auth/callback` route can redirect correctly without
  // forcing Google to match an exact redirect URL including query params.
  if (typeof window === 'undefined') return
  const secure = window.location.protocol === 'https:'
  const maxAgeSeconds = 10 * 60 // 10 minutes

  document.cookie = `${OAUTH_NEXT_COOKIE_NAME}=${encodeURIComponent(
    nextPath,
  )}; Path=/auth/callback; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure ? '; Secure' : ''}`
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 5.99 4.388 10.954 10.125 11.854V15.458H7.078v-3.458h3.047V9.202c0-2.84 1.492-4.407 4.119-4.407 1.203 0 2.482.215 2.482.215v2.73h-1.398c-1.38 0-1.809.856-1.809 1.734v2.084h3.075l-.492 3.458h-2.583v8.469C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  )
}

type SocialProvider = Extract<Provider, 'google' | 'apple' | 'facebook'>

const OTHER_PROVIDERS: {
  id: Extract<SocialProvider, 'apple' | 'facebook'>
  labelKey: string
  Icon: ComponentType<{ className?: string }>
}[] = [
  { id: 'apple', labelKey: 'auth.oauth.continueApple', Icon: AppleGlyph },
  { id: 'facebook', labelKey: 'auth.oauth.continueFacebook', Icon: FacebookGlyph },
]

type SocialAuthButtonsProps = {
  disabled?: boolean
  isOnline?: boolean
  onError: (message: string) => void
  onPendingChange?: (pending: boolean) => void
  /** When true, hide the "more sign-in options" dropdown and only show Google. */
  googleOnly?: boolean
  /** Called immediately before opening the OAuth URL (e.g. persist onboarding draft). */
  onBeforeOAuth?: () => void
}

export function SocialAuthButtons({
  disabled,
  isOnline = true,
  onError,
  onPendingChange,
  googleOnly = false,
  onBeforeOAuth,
}: SocialAuthButtonsProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<SocialProvider | null>(null)
  const moreRef = useRef<HTMLDetailsElement>(null)

  const startOAuth = useCallback(
    async (provider: SocialProvider) => {
      if (disabled || pending) return
      if (!isOnline) {
        onError(t('auth.oauth.errorOffline'))
        return
      }
      onBeforeOAuth?.()
      const redirectTo = buildOAuthRedirectTo()
      if (!redirectTo) {
        onError(t('auth.oauth.errorStart'))
        return
      }

      const supabaseCallback = getSupabaseGoogleOAuthCallbackUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.info('[SocialAuthButtons] OAuth redirectTo (app / Supabase client):', redirectTo)
      if (supabaseCallback) {
        console.info(
          '[SocialAuthButtons] Must be in Google Cloud → OAuth Web client → Authorized redirect URIs:',
          supabaseCallback,
        )
      } else {
        console.warn('[SocialAuthButtons] NEXT_PUBLIC_SUPABASE_URL missing — cannot log Supabase /auth/v1/callback for Google Console')
      }

      // Ensure `/auth/callback` knows where to go next after OAuth completes.
      setOAuthNextCookie(AUTH_OAUTH_CONTINUE_PATH)

      setPending(provider)
      onPendingChange?.(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (error) {
        const desc = (error as { error_description?: string })?.error_description
        console.error('[SocialAuthButtons] OAuth start failed:', provider, {
          message: error.message,
          name: error.name,
          status: (error as { status?: number }).status,
          error_description: desc,
        })
        if (
          /redirect_uri|redirect uri|mismatch/i.test(String(error.message || desc || ''))
        ) {
          console.error(
            '[SocialAuthButtons] redirect_uri_mismatch: add this exact URI in Google Cloud Console (Web client used by Supabase):',
            supabaseCallback ?? '(set NEXT_PUBLIC_SUPABASE_URL to print URL)',
          )
        }
        setPending(null)
        onPendingChange?.(false)
        onError(error.message || t('auth.oauth.errorStart'))
        return
      }
      if (data?.url) {
        window.location.assign(data.url)
        return
      }
      setPending(null)
      onPendingChange?.(false)
      onError(t('auth.oauth.errorStart'))
    },
    [disabled, pending, isOnline, onError, onPendingChange, onBeforeOAuth, t]
  )

  const busy = Boolean(pending) || Boolean(disabled)

  const startOther = async (provider: Extract<SocialProvider, 'apple' | 'facebook'>) => {
    await startOAuth(provider)
    moreRef.current?.removeAttribute('open')
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => startOAuth('google')}
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleGlyph className="h-5 w-5 shrink-0" />
        {pending === 'google' ? t('auth.oauth.redirecting') : t('auth.oauth.continueGoogle')}
      </button>

      {googleOnly ? null : (
        <details
          ref={moreRef}
          className="group rounded-xl border border-slate-200 bg-slate-50/80 open:bg-white open:shadow-sm"
        >
          <summary className="flex h-11 cursor-pointer list-none items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 [&::-webkit-details-marker]:hidden">
            <span>{t('auth.oauth.moreOptions')}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-slate-200/80 px-2 pb-2 pt-1">
            <div className="flex flex-col gap-2">
              {OTHER_PROVIDERS.map(({ id, labelKey, Icon }) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => void startOther(id)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-white text-sm font-semibold text-slate-800 transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {pending === id ? t('auth.oauth.redirecting') : t(labelKey)}
                </button>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  )
}

export function AuthEmailDivider() {
  const { t } = useTranslation()
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white px-3 text-slate-500">{t('auth.oauth.orEmail')}</span>
      </div>
    </div>
  )
}
