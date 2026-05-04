'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '@/components/providers/language-provider'

/**
 * First-run gate for unauthenticated users (after splash). Not to be confused with
 * `/welcome` (post-onboarding celebration in the app shell).
 */
export default function AuthWelcomePage() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-100 px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="shrink-0 overflow-hidden rounded-3xl shadow-[0_14px_44px_-10px_rgba(5,175,197,0.42)]">
          <Image
            src="/auth-welcome-logo.png"
            alt=""
            width={132}
            height={132}
            className="h-[132px] w-[132px] object-cover"
            priority
            unoptimized
          />
        </div>

        <p className="mt-10 text-lg font-normal leading-snug text-slate-500">
          {t('auth.welcome.taglineTop')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {t('auth.welcome.taglineBottom')}
        </h1>

        <Link
          href="/onboarding"
          className="mt-16 inline-flex h-10 shrink-0 items-center justify-center self-center rounded-full bg-[#05afc5] px-8 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(5,175,197,0.55)] transition hover:brightness-105 active:scale-[0.99]"
        >
          {t('auth.welcome.ctaNew')}
        </Link>

        <Link
          href="/auth/sign-in"
          className="mt-6 block text-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
        >
          {t('auth.welcome.ctaMember')}
        </Link>
      </div>
    </main>
  )
}
