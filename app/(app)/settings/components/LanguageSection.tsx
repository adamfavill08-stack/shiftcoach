'use client'

import { useState } from 'react'
import { Check, ChevronRight, Globe2, X } from 'lucide-react'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import {
  APP_MESSAGE_BUNDLE_LOCALES,
  LOCALE_META,
  resolveBrowserLocale,
} from '@/lib/i18n/supportedLocales'

export function LanguageSection() {
  const { preference, setPreference } = useLanguage()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const deviceResolved = resolveBrowserLocale()

  const summaryLabel =
    preference === 'device'
      ? t('settings.language.device')
      : LOCALE_META[preference].native

  const badge =
    preference === 'device' ? 'AUTO' : LOCALE_META[preference].badge

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-emerald-200/80 hover:shadow-[0_4px_12px_rgba(15,23,42,0.10)] transition-colors w-full"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center flex-shrink-0 text-[10px] font-semibold text-white shadow-sm">
            {badge}
          </div>
          <div className="flex flex-col items-start min-w-0">
            <h3 className="text-sm font-medium text-slate-800">{t('settings.language.title')}</h3>
            <p className="text-[11px] text-slate-500 truncate w-full">{summaryLabel}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-400 transition flex-shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label={t('settings.language.closePicker')}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shiftcoach-lang-title"
            className="relative z-10 flex max-h-[min(32rem,85vh)] w-full max-w-md flex-col rounded-t-3xl border border-slate-200/80 bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.2)] dark:border-slate-700/60 dark:bg-slate-900 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Globe2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 space-y-1">
                  <h2 id="shiftcoach-lang-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t('settings.language.chooseTitle')}
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    {t('settings.language.fallbackProgress')}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    {t('settings.language.fallbackEnglish')}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                    {t('settings.language.fallbackHint')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t('settings.language.closePicker')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  setPreference('device')
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                  preference === 'device'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-100'
                }`}
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {preference === 'device' ? (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : null}
                </span>
                <span className="flex-1">
                  <span className="font-medium block">{t('settings.language.device')}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {LOCALE_META[deviceResolved].native} ({deviceResolved})
                  </span>
                </span>
              </button>

              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

              {APP_MESSAGE_BUNDLE_LOCALES.map((code) => {
                const meta = LOCALE_META[code]
                const selected = preference !== 'device' && preference === code
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setPreference(code)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                      selected
                        ? 'bg-sky-50 dark:bg-sky-950/35 text-sky-900 dark:text-sky-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {selected ? <Check className="h-4 w-4 text-sky-600 dark:text-sky-400" /> : null}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium block">{meta.native}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">{code}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{meta.badge}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
