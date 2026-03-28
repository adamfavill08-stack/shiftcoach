'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

/** Light shell to match app background (layout theme-color / main bg) */
const STATUS_BAR_BACKGROUND = '#ffffff'

const DATA_ATTR = 'data-cap-android-statusbar'

/**
 * Configure the system status bar on Capacitor Android only.
 * No-ops on web and iOS.
 *
 * Capacitor naming (easy to invert): Style.Light = dark icons/text on a light bar;
 * Style.Dark = light icons on a dark bar. We want the former for a light UI.
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
          await StatusBar.setStyle({ style: Style.Light })
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
