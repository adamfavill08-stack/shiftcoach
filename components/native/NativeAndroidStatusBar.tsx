'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

/** Matches app dark header / slate-900 treatment */
const STATUS_BAR_BACKGROUND = '#0f172a'

const DATA_ATTR = 'data-cap-android-statusbar'

/**
 * Configure the system status bar on Capacitor Android only.
 * No-ops on web and iOS.
 */
export function NativeAndroidStatusBar() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    let cancelled = false

    void import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      if (cancelled) return
      void (async () => {
        try {
          await StatusBar.show()
          await StatusBar.setOverlaysWebView({ overlay: false })
          // Style.Dark = light status bar content (icons/text) for dark backgrounds
          await StatusBar.setStyle({ style: Style.Dark })
          await StatusBar.setBackgroundColor({ color: STATUS_BAR_BACKGROUND })
        } catch (e) {
          console.warn('[NativeAndroidStatusBar] configuration failed', e)
        }
      })()
    })

    document.documentElement.setAttribute(DATA_ATTR, '')

    return () => {
      cancelled = true
      document.documentElement.removeAttribute(DATA_ATTR)
    }
  }, [])

  return null
}
