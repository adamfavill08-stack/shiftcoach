'use client'

import { useSettings } from '@/lib/hooks/useSettings'
import { useTranslation } from '@/components/providers/language-provider'

function regionTranslationKey(region: string): string {
  switch (region) {
    case 'uk':
      return 'settings.region.uk'
    case 'eu':
      return 'settings.region.eu'
    case 'us':
      return 'settings.region.us'
    case 'aus':
      return 'settings.region.aus'
    default:
      return 'settings.region.fallbackLabel'
  }
}

export function RegionUnitsSection() {
  const { t } = useTranslation()
  const { settings, loading } = useSettings()

  if (loading || !settings?.region) {
    return null
  }

  const currentRegion = (settings.region as 'uk' | 'eu' | 'us' | 'aus') || 'uk'
  const regionLabel = t(regionTranslationKey(currentRegion))

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)] px-5 py-4">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50/30 via-transparent to-transparent" />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 border border-sky-200/60 shadow-sm">
            <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 10l9 4 9-4m-18-5l9 4 9-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{t('settings.region.title')}</h3>
            <p className="text-xs text-slate-500">{t('settings.region.subtitle')}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-700 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
          {regionLabel}
        </span>
      </div>
    </div>
  )
}
