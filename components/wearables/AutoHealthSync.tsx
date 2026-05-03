'use client'

import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { readHealthConnectNativeLinkedPersisted, persistHealthConnectNativeLinked } from '@/lib/native/wearablesHealthConnectPersisted'
import { runHealthConnectNativeSync } from '@/lib/native/runHealthConnectNativeSync'

/** Minimum time between timer-driven native Health Connect syncs while the app stays open. */
const HEALTH_CONNECT_AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000

const LAST_NATIVE_SYNC_TS_KEY = 'health:autoSyncNative:lastTs'

function isAndroidNative(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
}

/**
 * Periodically pulls Health Connect on Android when the user has already linked HC,
 * so they do not need to open Settings and tap sync every time.
 *
 * Runs: **immediately** when the shell mounts (app open / cold start) and again when the app
 * returns to the foreground — no throttle on those. Also on a **15-minute timer** while the
 * WebView is alive (timer skips if a sync succeeded within the last 15 minutes).
 *
 * Note: true background sync while the app process is stopped would require a native
 * WorkManager job and persisted auth; this path covers typical in-pocket / multitasking use.
 */
export function AutoHealthSync() {
  const inFlight = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !isAndroidNative()) return

    const maybeSync = async (reason: string, opts?: { bypassThrottle?: boolean }) => {
      if (!readHealthConnectNativeLinkedPersisted()) return
      if (inFlight.current) return

      if (!opts?.bypassThrottle) {
        try {
          const last = window.localStorage.getItem(LAST_NATIVE_SYNC_TS_KEY)
          if (last) {
            const ts = Number(last)
            if (!Number.isNaN(ts) && Date.now() - ts < HEALTH_CONNECT_AUTO_SYNC_INTERVAL_MS) {
              return
            }
          }
        } catch {
          /* ignore */
        }
      }

      inFlight.current = true
      try {
        const syncResult = await runHealthConnectNativeSync(`AutoHealthSync/${reason}`)
        if (!syncResult.ok) return

        const ts = syncResult.lastSyncedAt ? new Date(syncResult.lastSyncedAt).getTime() : Date.now()
        try {
          window.localStorage.setItem(LAST_NATIVE_SYNC_TS_KEY, String(Date.now()))
          window.localStorage.setItem('wearables:lastSyncedAt', String(ts))
        } catch {
          /* ignore */
        }
        persistHealthConnectNativeLinked()
        window.dispatchEvent(new CustomEvent('wearables-synced', { detail: { ts } }))
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      } catch {
        /* Swallow — auto-sync must not break the app */
      } finally {
        inFlight.current = false
      }
    }

    void maybeSync('mount', { bypassThrottle: true })

    const intervalId = window.setInterval(() => {
      void maybeSync('interval')
    }, HEALTH_CONNECT_AUTO_SYNC_INTERVAL_MS)

    let removeListener: (() => void) | undefined
    const sub = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void maybeSync('resume', { bypassThrottle: true })
    })
    void sub.then((handle) => {
      removeListener = () => {
        void handle.remove()
      }
    })

    return () => {
      window.clearInterval(intervalId)
      removeListener?.()
    }
  }, [])

  return null
}
