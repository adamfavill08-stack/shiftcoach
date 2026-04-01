'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

/** Light shell to match app background (layout theme-color / main bg) */
const STATUS_BAR_BACKGROUND = '#f1f1f3'

const DATA_ATTR = 'data-cap-android-statusbar'

/**
 * Configure the system status bar on Capacitor Android only.
 * No-ops on web and iOS.
 *
 * Capacitor: Style.Light => dark status-bar icons (light bar). Style.Dark => light icons.
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
          await StatusBar.setBackgroundColor({ color: STATUS_BAR_BACKGROUND })
          await StatusBar.setStyle({ style: Style.Light })

          const info = await StatusBar.getInfo()
          console.log('[NativeAndroidStatusBar] STATUS BAR INFO', info)

          // Second pass: WebView / edge-to-edge can reset flags after first paint
          requestAnimationFrame(() => {
            if (cancelled) return
            void (async () => {
              try {
                await StatusBar.setOverlaysWebView({ overlay: false })
                await StatusBar.setBackgroundColor({ color: STATUS_BAR_BACKGROUND })
                await StatusBar.setStyle({ style: Style.Light })
                const again = await StatusBar.getInfo()
                console.log('[NativeAndroidStatusBar] STATUS BAR INFO (after rAF)', again)
              } catch (e) {
                console.warn('[NativeAndroidStatusBar] rAF reapply failed', e)
              }
            })()
          })
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
