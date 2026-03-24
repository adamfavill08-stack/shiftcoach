'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

/**
 * Android hardware back: navigate within the WebView (Next.js history) instead of closing the app.
 * When history is empty on primary shell routes, minimize to home (same idea as “leave” without killing state).
 */
export function NativeAndroidBackButton() {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    let cancelled = false
    let handle: { remove: () => Promise<void> } | undefined

    const tabRoots = new Set([
      '/dashboard',
      '/',
      '/rota',
      '/blog',
      '/progress',
      '/profile',
      '/splash',
      '/welcome',
    ])

    void import('@capacitor/app').then(({ App }) => {
      if (cancelled) return

      void App.addListener('backButton', ({ canGoBack }) => {
        const path = pathnameRef.current

        if (canGoBack) {
          router.back()
          return
        }

        if (path.startsWith('/auth/') && path !== '/auth/sign-in') {
          router.replace('/auth/sign-in')
          return
        }

        if (path.startsWith('/auth/sign-in')) {
          void App.minimizeApp()
          return
        }

        if (path.startsWith('/onboarding')) {
          void App.minimizeApp()
          return
        }

        if (!tabRoots.has(path)) {
          router.replace('/dashboard')
          return
        }

        void App.minimizeApp()
      }).then((h) => {
        if (cancelled) {
          void h.remove()
          return
        }
        handle = h
      })
    })

    return () => {
      cancelled = true
      void handle?.remove()
    }
  }, [router])

  return null
}
