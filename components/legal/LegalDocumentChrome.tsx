'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import { intlLocaleForApp } from '@/lib/i18n/supportedLocales'

const chromeKeys = {
  privacy: {
    title: 'legal.privacy.title',
    lastUpdated: 'legal.privacy.lastUpdated',
    englishNote: 'legal.privacy.englishNote',
  },
  terms: {
    title: 'legal.terms.title',
    lastUpdated: 'legal.terms.lastUpdated',
    englishNote: 'legal.terms.englishNote',
  },
  health: {
    title: 'legal.healthNotice.title',
    lastUpdated: 'legal.healthNotice.lastUpdated',
    englishNote: 'legal.healthNotice.englishNote',
  },
} as const

export type LegalDocumentVariant = keyof typeof chromeKeys

export function LegalDocumentChrome({
  variant,
  children,
  /** When set (e.g. legal review date), avoids showing today’s calendar date on static policies */
  lastUpdatedLabel,
}: {
  variant: LegalDocumentVariant
  children: ReactNode
  lastUpdatedLabel?: string
}) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const intlLocale = useMemo(() => intlLocaleForApp(language), [language])
  const k = chromeKeys[variant]
  const lastUpdated =
    lastUpdatedLabel?.trim() ||
    new Date().toLocaleDateString(intlLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] px-6 py-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t(k.title)}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-2">
            {t(k.lastUpdated, { date: lastUpdated })}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-6">
            {t(k.englishNote)}
          </p>
          {children}
        </div>
      </div>
    </main>
  )
}
