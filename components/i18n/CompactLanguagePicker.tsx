'use client'

import { useEffect, useState } from 'react'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import {
  APP_MESSAGE_BUNDLE_LOCALES,
  LOCALE_META,
  resolveBrowserLocale,
  shouldShowAuthLanguagePicker,
  type AppLocaleCode,
} from '@/lib/i18n/supportedLocales'

type CompactLanguagePickerProps = {
  className?: string
  id?: string
  /** Tighter layout for auth cards */
  variant?: 'default' | 'compact'
  /**
   * When true (sign-in / sign-up): only render after mount, and only if device language
   * is not mapped to a bundled UI locale (user would otherwise see English with no hint).
   */
  onlyWhenDeviceLanguageUnsupported?: boolean
}

export function CompactLanguagePicker({
  className = '',
  id = 'compact-app-language',
  variant = 'default',
  onlyWhenDeviceLanguageUnsupported = false,
}: CompactLanguagePickerProps) {
  const { preference, setPreference } = useLanguage()
  const { t } = useTranslation()
  const [authVisible, setAuthVisible] = useState(!onlyWhenDeviceLanguageUnsupported)

  useEffect(() => {
    if (!onlyWhenDeviceLanguageUnsupported) {
      setAuthVisible(true)
      return
    }
    const device = resolveBrowserLocale()
    setAuthVisible(shouldShowAuthLanguagePicker(preference, device))
  }, [onlyWhenDeviceLanguageUnsupported, preference])

  const selectValue = preference === 'device' ? 'device' : preference

  if (onlyWhenDeviceLanguageUnsupported && !authVisible) {
    return null
  }

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={
          variant === 'compact'
            ? 'block text-[11px] font-medium text-slate-500 mb-1'
            : 'block text-xs font-medium text-slate-600 mb-1.5'
        }
      >
        {t('auth.language.label')}
      </label>
      <select
        id={id}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'device') setPreference('device')
          else setPreference(v as AppLocaleCode)
        }}
        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400"
      >
        <option value="device">{t('settings.language.device')}</option>
        {APP_MESSAGE_BUNDLE_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_META[code].native}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">{t('auth.language.hint')}</p>
    </div>
  )
}
