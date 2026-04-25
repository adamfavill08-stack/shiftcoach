'use client'

import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'

const ANDROID_HEALTH_PROVIDER = 'android_health_connect'

type StatusPayload = {
  connected?: boolean
  provider?: string | null
  providers?: {
    healthConnectConnected?: boolean
  }
}

async function getBackendHealthConnectConnected(): Promise<boolean> {
  try {
    const now = Date.now()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startTimeMillis = startOfDay.getTime()
    const res = await fetch(
      `/api/wearables/status?startTimeMillis=${startTimeMillis}&endTimeMillis=${now}`,
      { method: 'GET' },
    )
    if (!res.ok) return false
    const data = (await res.json().catch(() => ({}))) as StatusPayload
    return (
      data.providers?.healthConnectConnected === true ||
      data.provider === ANDROID_HEALTH_PROVIDER
    )
  } catch {
    return false
  }
}

async function getAndroidPermissionConnected(): Promise<{
  isAndroidNative: boolean
  available: boolean
  hasPermissions: boolean
}> {
  const isAndroidNative = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
  if (!isAndroidNative) {
    return { isAndroidNative: false, available: false, hasPermissions: false }
  }

  const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
  try {
    const status = await ShiftCoachHealthConnect.getStatus()
    return {
      isAndroidNative: true,
      available: status.available,
      hasPermissions: status.available && status.hasPermissions,
    }
  } catch {
    return { isAndroidNative: true, available: false, hasPermissions: false }
  }
}

export default function SyncWearableButton() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isAndroidNative, setIsAndroidNative] = useState(false)
  const [hasHealthConnectAvailable, setHasHealthConnectAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadConnectionState() {
      const [nativeStatus, backendConnected] = await Promise.all([
        getAndroidPermissionConnected(),
        getBackendHealthConnectConnected(),
      ])

      if (cancelled) return

      setIsAndroidNative(nativeStatus.isAndroidNative)
      setHasHealthConnectAvailable(nativeStatus.available)
      setIsConnected(Boolean(nativeStatus.hasPermissions || backendConnected))
    }

    loadConnectionState()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleClick() {
    setLoading(true)
    setFeedback(null)

    try {
      if (isAndroidNative) {
        const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
        const nativeStatus = await ShiftCoachHealthConnect.getStatus()

        if (!nativeStatus.available) {
          setFeedback('Health Connect is not available on this device.')
          return
        }

        // Always re-check native permission on tap. Backend "connected" can be stale
        // if user revoked Health Connect permission after a prior successful sync.
        if (!nativeStatus.hasPermissions) {
          const permission = await ShiftCoachHealthConnect.requestConnectPermissions()
          if (!permission.granted) {
            setFeedback('Health Connect permission was not granted.')
            return
          }

          setIsConnected(true)
          setFeedback('Health Connect connected successfully.')
        }

        const syncResult = await ShiftCoachHealthConnect.syncNow()
        if (syncResult.ok) {
          const ts = syncResult.lastSyncedAt ? new Date(syncResult.lastSyncedAt).getTime() : Date.now()
          localStorage.setItem('wearables:lastSyncedAt', String(ts))
          window.dispatchEvent(new CustomEvent('wearables-synced', { detail: { ts } }))
          if (isConnected) {
            setFeedback('Synced successfully.')
          }
          return
        }

        setFeedback('Sync failed. Please try again.')
        return
      }

      // Web/iOS fallback path remains provider-aware via existing backend endpoint.
      const now = Date.now()
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const startTimeMillis = startOfDay.getTime()
      const res = await fetch('/api/wearables/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTimeMillis, endTimeMillis: now }),
      })
      const data = await res.json().catch(() => ({}))

      if (data.error === 'no_wearable_connection') {
        setFeedback('No wearable connection found.')
        return
      }

      if (!res.ok) {
        setFeedback('Sync failed. Please try again.')
        return
      }

      const { lastSyncedAt: serverTs } = data
      const ts = serverTs ? new Date(serverTs).getTime() : Date.now()
      localStorage.setItem('wearables:lastSyncedAt', String(ts))
      window.dispatchEvent(new CustomEvent('wearables-synced', { detail: { ts } }))
      setFeedback('Synced successfully.')
    } catch {
      setFeedback('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const buttonText = !isConnected ? 'Connect Health Connect' : 'Sync now'
  const helperText = !isConnected
    ? 'Connect to Health Connect to sync your steps, sleep, and heart rate.'
    : 'Your Health Connect data is linked. Tap to sync latest data.'
  const isButtonDisabled =
    loading || (isAndroidNative && !hasHealthConnectAvailable && !isConnected)

  return (
    <div className="w-full sm:max-w-md">
      <button
        type="button"
        onClick={handleClick}
        disabled={isButtonDisabled}
        className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            <span>Loading...</span>
          </>
        ) : (
          <span>{buttonText}</span>
        )}
      </button>

      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{helperText}</p>

      {isAndroidNative && !hasHealthConnectAvailable && !isConnected ? (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          Health Connect is not available on this device yet. Install or update Health Connect, then try
          again.
        </p>
      ) : null}

      {feedback ? (
        <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">{feedback}</p>
      ) : null}
    </div>
  )
}

