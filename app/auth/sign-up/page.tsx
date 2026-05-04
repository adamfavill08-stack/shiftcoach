'use client'

import { Suspense } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/providers/language-provider'
import { CompactLanguagePicker } from '@/components/i18n/CompactLanguagePicker'
import { SignUpFormFields } from '@/components/auth/SignUpFormFields'

function SignUpContent() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
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
              <p className="mx-auto mt-4 max-w-[36ch] text-sm leading-relaxed text-slate-700">
                {t('auth.tagline')}
              </p>

              <div className="mt-5 px-0.5 text-left">
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
              <SignUpFormFields onSuccess={() => router.replace('/auth/sign-in?account_created=1')} />
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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <div className="relative z-10 w-full max-w-md">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-7 text-center text-sm text-slate-500 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
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
