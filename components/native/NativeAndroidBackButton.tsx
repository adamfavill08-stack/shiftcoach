'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
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
 * 1. Hardware back on subpage: `canGoBack` → `window.history.back()` → `/settings`.
 * 2. Keep backing through Rota → Dashboard while `canGoBack` is true.
 * 3. On a shell route with **no** history (`!canGoBack`): first back → one `showToast('Press…')`;
 *    second back within {@link DOUBLE_TAP_MS} → `exitApp()` (no duplicate toast from one press).
 */
const SHELL_DOUBLE_BACK_EXIT = new Set(['/dashboard', '/rota', '/blog', '/settings'])

function normalizePath(p: string) {
  const raw = (p ?? '').trim()
  // Avoid treating a brief empty pathname as `/` (splash branch → minimize feels like “app closed”).
  if (!raw) return '/dashboard'
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw
}

/**
 * Android hardware back:
 * - If the WebView reports history (`canGoBack`), call `window.history.back()` (matches WebView stack; Capacitor docs).
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

  const lastShellBackPress = useRef(0)

  useLayoutEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    lastShellBackPress.current = 0
  }, [pathname])

  // useLayoutEffect: register before paint so Capacitor's AppPlugin always sees a backButton listener
  // (otherwise native falls through when !canGoBack and the activity can finish — “app closes”).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    let cancelled = false
    let handle: { remove: () => Promise<void> } | undefined

    void (async () => {
      try {
        await App.toggleBackButtonHandler({ enabled: true })
      } catch {
        /* older native builds without toggle — ignore */
      }
      try {
        handle = await App.addListener('backButton', ({ canGoBack }) => {
          const path = normalizePath(pathnameRef.current)

          if (canGoBack) {
            window.history.back()
            return
          }

          if (path.startsWith('/auth/welcome')) {
            void App.minimizeApp()
            return
          }

          if (
            path.startsWith('/auth/') &&
            path !== '/auth/sign-in' &&
            path !== '/auth/sign-up' &&
            !path.startsWith('/auth/welcome')
          ) {
            router.replace('/auth/sign-up')
            return
          }

          if (path.startsWith('/auth/sign-in') || path.startsWith('/auth/sign-up')) {
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
        })
        if (cancelled && handle) {
          void handle.remove()
          handle = undefined
        }
      } catch (e) {
        console.error('[NativeAndroidBackButton] Failed to register backButton listener', e)
      }
    })()

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
