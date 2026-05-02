'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { THEME_STORAGE_EVENT, THEME_PREFERENCE_KEY, THEME_LEGACY_STORAGE_KEY } from '@/lib/theme/preference'
import { applyAndroidSystemBarsFromDocument } from '@/lib/native/androidSystemBars'

const DATA_ATTR = 'data-cap-android-statusbar'

/**
 * Keeps Android status + navigation bars in sync with resolved app theme (System / Light / Dark).
 * No-ops on web and iOS.
 */
export function NativeAndroidStatusBar() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    const sync = () => {
      void applyAndroidSystemBarsFromDocument()
    }

    sync()

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemScheme = () => sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_PREFERENCE_KEY || e.key === THEME_LEGACY_STORAGE_KEY) sync()
    }
    const onCustomTheme = () => sync()

    media.addEventListener('change', onSystemScheme)
    window.addEventListener('storage', onStorage)
    window.addEventListener(THEME_STORAGE_EVENT, onCustomTheme)

    const root = document.documentElement
    const observer = new MutationObserver(() => {
      sync()
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    document.documentElement.setAttribute(DATA_ATTR, '')

    return () => {
      media.removeEventListener('change', onSystemScheme)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(THEME_STORAGE_EVENT, onCustomTheme)
      observer.disconnect()
      document.documentElement.removeAttribute(DATA_ATTR)
    }
  }, [])

  return null
}
