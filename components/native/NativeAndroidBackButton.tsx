'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { showToast } from '@/components/ui/Toast'

const DOUBLE_TAP_MS = 2000

/** Main app home: double back exits (native). */
const HOME_DOUBLE_EXIT_PATHS = new Set(['/dashboard'])

/**
 * Bottom-nav roots: back with no history → dashboard (stay in app).
 * Splash / welcome are handled separately — not tab shells.
 */
const TAB_BAR_ROOTS = new Set(['/rota', '/blog', '/progress', '/profile'])

/**
 * Android hardware back:
 * - In-app history first (`router.back` when `canGoBack`).
 * - `/`, `/splash`: boot-style entry → minimize (don’t dump user onto dashboard mid-splash).
 * - `/welcome`: one-shot post-onboarding → clear flag + go to dashboard (same intent as Continue).
 * - `/dashboard`: double-press + toast → `exitApp`.
 * - Tab bar roots with no history → `replace('/dashboard')`.
 * - Anything else → `replace('/dashboard')`.
 */
export function NativeAndroidBackButton() {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const lastHomeBackPress = useRef(0)

  useEffect(() => {
    lastHomeBackPress.current = 0
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    let cancelled = false
    let handle: { remove: () => Promise<void> } | undefined

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

        // Entry / boot (root renders splash; `/splash` if hit directly)
        if (path === '/' || path === '/splash') {
          void App.minimizeApp()
          return
        }

        // Post-onboarding welcome — same outcome as tapping Continue
        if (path === '/welcome') {
          try {
            sessionStorage.removeItem('fromOnboarding')
          } catch {
            /* ignore */
          }
          router.replace('/dashboard')
          return
        }

        if (path !== '/dashboard' && !TAB_BAR_ROOTS.has(path)) {
          router.replace('/dashboard')
          return
        }

        if (HOME_DOUBLE_EXIT_PATHS.has(path)) {
          const now = Date.now()
          if (now - lastHomeBackPress.current < DOUBLE_TAP_MS) {
            lastHomeBackPress.current = 0
            void App.exitApp()
          } else {
            lastHomeBackPress.current = now
            showToast('Press back again to exit', 'info')
          }
          return
        }

        router.replace('/dashboard')
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

  /**
   * Installed PWA on Android: double-back only on `/dashboard` (same as native home).
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (Capacitor.isNativePlatform()) return

    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!standalone || !/Android/i.test(navigator.userAgent)) return

    const last = { current: 0 }

    const onPopState = () => {
      const p = window.location.pathname
      if (!HOME_DOUBLE_EXIT_PATHS.has(p)) return
      const now = Date.now()
      if (now - last.current < DOUBLE_TAP_MS) {
        last.current = 0
        window.close()
      } else {
        last.current = now
        showToast('Press back again to exit', 'info')
        window.history.pushState(null, '', window.location.href)
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return null
}
