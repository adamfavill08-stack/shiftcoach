'use client'

import { ChevronRight } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'
import { useTranslation } from '@/components/providers/language-provider'

export function LanguageSection() {
  const { preference, setPreference } = useLanguage()
  const { t } = useTranslation()

  const label =
    preference === 'device'
      ? t('settings.language.device')
      : preference === 'es'
      ? t('settings.language.es')
      : preference === 'de'
      ? t('settings.language.de')
      : t('settings.language.en')

  const badge = preference === 'device' ? 'SYS' : 'EN'

  return (
    <button
      type="button"
      onClick={() => {
        const next =
          preference === 'device'
            ? 'en'
            : preference === 'en'
            ? 'es'
            : preference === 'es'
            ? 'de'
            : 'device'
        setPreference(next)
      }}
      className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-emerald-200/80 hover:shadow-[0_4px_12px_rgba(15,23,42,0.10)] transition-colors w-full"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center flex-shrink-0 text-[11px] font-semibold text-white shadow-sm">
          {badge}
        </div>
        <div className="flex flex-col items-start">
          <h3 className="text-sm font-medium text-slate-800">
            {t('settings.language.title')}
          </h3>
          <p className="text-[11px] text-slate-500">
            {label}
          </p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-400 transition flex-shrink-0" />
    </button>
  )
}

