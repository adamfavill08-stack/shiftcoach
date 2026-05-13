'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '@/components/providers/language-provider'

/**
 * First-run gate for unauthenticated users (after splash). Not to be confused with
 * `/welcome` (post-onboarding celebration in the app shell).
 */
export default function AuthWelcomePage() {
  const { t } = useTranslation()

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [])

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] max-h-[100dvh] w-full flex-row items-stretch justify-center overflow-hidden overscroll-none bg-[#0a0a0f]">
      {/* One column: background + UI share the same width as a phone (full width on small devices) */}
      <div className="relative flex h-full min-h-0 w-[min(100%,26rem)] shrink-0 flex-col overflow-hidden md:rounded-2xl md:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.85)] md:ring-1 md:ring-white/10">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <Image
            src="/auth-welcome-background.png"
            alt=""
            fill
            className="object-cover object-left"
            priority
            unoptimized
            sizes="(max-width: 640px) 100vw, 416px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/35 to-slate-950/90" />
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <span
              className="text-lg font-semibold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-xl"
              aria-label={t('welcome.logoAlt')}
            >
              Shift<span className="text-[#05afc5]">Coach</span>
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
            <div className="w-full shrink-0 translate-y-3 text-left sm:translate-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#05afc5]">
                {t('auth.welcome.headline')}
              </p>
              <h1 className="mt-3 text-[1.85rem] font-bold leading-[1.05] tracking-tight text-white">
                <span className="block">{t('auth.welcome.titleLine1')}</span>
                <span className="block">{t('auth.welcome.titleLine2')}</span>
              </h1>
              <p className="mt-4 max-w-[19rem] whitespace-pre-line text-left text-[0.9375rem] font-normal leading-relaxed text-white/95">
                {t('auth.welcome.subtitle')}
              </p>

              <Link
                href="/onboarding"
                className="mt-8 flex h-11 w-full items-center justify-center rounded-lg bg-[#05afc5] text-[0.9375rem] font-semibold text-white shadow-[0_6px_24px_-4px_rgba(5,175,197,0.55)] transition hover:brightness-110 active:scale-[0.99]"
              >
                {t('auth.welcome.ctaNew')}
              </Link>

              <p className="mt-5 text-center text-[0.8125rem] leading-snug text-white/85">
                <span>{t('auth.welcome.footerPrompt')}</span>{' '}
                <Link
                  href="/auth/sign-in"
                  className="font-semibold text-[#05afc5] underline-offset-2 hover:underline"
                >
                  {t('auth.welcome.footerLogIn')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
