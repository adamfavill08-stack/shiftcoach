'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { showToast } from '@/components/ui/Toast'

const DOUBLE_TAP_MS = 2000

/**
 * Bottom-nav “shell” routes: when the WebView cannot go back, first hardware back
 * shows a toast; second back within {@link DOUBLE_TAP_MS} exits the app.
 *
 * **Tab navigation (verified):** {@link components/ui/BottomNav.tsx} uses `<Link href>`
 * for `/dashboard`, `/rota`, `/blog`, `/settings` only — no `router.replace` on tab switches,
 * so the SPA/WebView stack normally grows with tab changes and `canGoBack` stays accurate.
 * Other `router.replace` usages (e.g. auth, onboarding, Google Fit query cleanup on dashboard,
 * stripping query params on profile) are intentional, not main-tab navigation.
 *
 * **Manual QA (Android native), tab-style stack:**
 * Dashboard → Rota → Settings → open a settings subpage (e.g. Profile).
 * 1. Hardware back on subpage: `canGoBack` → `router.back()` → `/settings`.
 * 2. Keep backing through Rota → Dashboard while `canGoBack` is true.
 * 3. On a shell route with **no** history (`!canGoBack`): first back → one `showToast('Press…')`;
 *    second back within {@link DOUBLE_TAP_MS} → `exitApp()` (no duplicate toast from one press).
 */
const SHELL_DOUBLE_BACK_EXIT = new Set(['/dashboard', '/rota', '/blog', '/settings'])

function normalizePath(p: string) {
  if (!p) return '/'
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
}

/** Start loading Capacitor App as soon as this chunk runs in the browser (reduces race before listener attaches). */
function preloadCapacitorApp() {
  if (typeof window === 'undefined') return
  void import('@capacitor/app')
}

preloadCapacitorApp()

/**
 * Android hardware back:
 * - If the WebView reports history (`canGoBack`), delegate to Next.js via `router.back()` (preserves SPA stack).
 * - `/`, `/splash`: minimize (avoid dumping users mid-boot).
 * - `/welcome`: same as Continue — session flag + dashboard.
 * - `/auth/sign-in`, `/onboarding`: minimize.
 * - Other `/auth/*`: replace → sign-in.
 * - `/settings/*` (not index): replace → `/settings`.
 * - Shell tab roots with no WebView back stack: double-back + toast → `exitApp`.
 * - Any other route with no stack: replace → `/dashboard`.
 *
 * Installed PWA on Android (non-Capacitor): popstate double-back on `/dashboard` only.
 */
export function NativeAndroidBackButton() {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const lastShellBackPress = useRef(0)

  useEffect(() => {
    lastShellBackPress.current = 0
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    let cancelled = false
    let handle: { remove: () => Promise<void> } | undefined

    void import('@capacitor/app').then(({ App }) => {
      if (cancelled) return

      void App.addListener('backButton', ({ canGoBack }) => {
        const path = normalizePath(pathnameRef.current)

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

        if (path === '/' || path === '/splash') {
          void App.minimizeApp()
          return
        }

        if (path === '/welcome') {
          try {
            sessionStorage.removeItem('fromOnboarding')
          } catch {
            /* ignore */
          }
          router.replace('/dashboard')
          return
        }

        if (path.startsWith('/settings/')) {
          router.replace('/settings')
          return
        }

        if (SHELL_DOUBLE_BACK_EXIT.has(path)) {
          const now = Date.now()
          if (now - lastShellBackPress.current < DOUBLE_TAP_MS) {
            lastShellBackPress.current = 0
            void App.exitApp()
          } else {
            lastShellBackPress.current = now
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
      const p = normalizePath(window.location.pathname)
      if (p !== '/dashboard') return
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
