'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Watch } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'

export function WearablesSection() {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={() => router.push('/wearables-setup')}
      className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full text-left"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 grid place-items-center flex-shrink-0 shadow-sm">
          <Watch className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900">{t('settings.wearables.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t('settings.wearables.subtitle')}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition flex-shrink-0" strokeWidth={2} aria-hidden />
    </button>
  )
}
