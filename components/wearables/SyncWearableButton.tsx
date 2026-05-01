'use client'

import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import type { ShiftCoachHealthConnectPlugin } from '@/lib/native/shiftCoachHealthConnect'

const ANDROID_HEALTH_PROVIDER = 'android_health_connect'

const HC_INCOMPLETE_PERMISSIONS_MESSAGE =
  'Permission was not completed. Open Health Connect and allow Steps, Sleep, Heart Rate, and Activity permissions for ShiftCoach.'

function capacitorErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: string }).code
    return typeof c === 'string' ? c : ''
  }
  return ''
}

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
  debug?: Awaited<ReturnType<ShiftCoachHealthConnectPlugin['getStatus']>>
}> {
  const isAndroidNative = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
  if (!isAndroidNative) {
    return { isAndroidNative: false, available: false, hasPermissions: false }
  }

  const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
  try {
    const status = await ShiftCoachHealthConnect.getStatus()
    const available = status.canCreateClient === true || status.available
    return {
      isAndroidNative: true,
      available,
      hasPermissions: available && status.hasPermissions,
      debug: status,
    }
  } catch {
    return { isAndroidNative: true, available: false, hasPermissions: false }
  }
}

export default function SyncWearableButton() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showOpenHealthConnectSettings, setShowOpenHealthConnectSettings] = useState(false)
  const [isAndroidNative, setIsAndroidNative] = useState(false)
  const [hasHealthConnectAvailable, setHasHealthConnectAvailable] = useState(false)
  const [debugStatus, setDebugStatus] = useState<Awaited<ReturnType<ShiftCoachHealthConnectPlugin['getStatus']>> | null>(null)

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
      setDebugStatus(nativeStatus.debug ?? null)
    }

    loadConnectionState()

    return () => {
      cancelled = true
    }
  }, [])

  async function openHealthConnectAppSettings() {
    setShowOpenHealthConnectSettings(false)
    try {
      const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
      await ShiftCoachHealthConnect.openPermissionSettings()
      setFeedback('When you have allowed access, return here and tap Sync again.')
    } catch (e) {
      console.warn('[SyncWearableButton] openPermissionSettings', e)
      setFeedback('Could not open settings. Open Health Connect from your app list and allow data access for ShiftCoach.')
    }
  }

  async function handleClick() {
    setLoading(true)
    setFeedback(null)
    setShowOpenHealthConnectSettings(false)

    try {
      if (isAndroidNative) {
        const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
        const nativeStatus = await ShiftCoachHealthConnect.getStatus()
        setDebugStatus(nativeStatus)
        const available = nativeStatus.canCreateClient === true || nativeStatus.available

        if (!available) {
          setFeedback('Health Connect is not available on this device.')
          return
        }

        // Always re-check native permission on tap. Backend "connected" can be stale
        // if user revoked Health Connect permission after a prior successful sync.
        if (!nativeStatus.hasPermissions) {
          try {
            const permission = await ShiftCoachHealthConnect.requestConnectPermissions()
            if (!permission.granted) {
              setFeedback(HC_INCOMPLETE_PERMISSIONS_MESSAGE)
              setShowOpenHealthConnectSettings(true)
              return
            }
          } catch (permErr) {
            console.warn('[SyncWearableButton] requestConnectPermissions', permErr)
            setFeedback(HC_INCOMPLETE_PERMISSIONS_MESSAGE)
            setShowOpenHealthConnectSettings(true)
            return
          }

          setIsConnected(true)
          setFeedback('Health Connect connected successfully.')
        }

        try {
          const syncResult = await ShiftCoachHealthConnect.syncNow()
          if (syncResult.ok) {
            const ts = syncResult.lastSyncedAt ? new Date(syncResult.lastSyncedAt).getTime() : Date.now()
            localStorage.setItem('wearables:lastSyncedAt', String(ts))
            window.dispatchEvent(new CustomEvent('wearables-synced', { detail: { ts } }))
            setIsConnected(true)
            if (isConnected) {
              setFeedback('Synced successfully.')
            } else {
              setFeedback('Health Connect connected successfully.')
            }
            return
          }
        } catch (syncErr: unknown) {
          const code = capacitorErrorCode(syncErr)
          if (code === 'health_connect_permissions') {
            setFeedback(HC_INCOMPLETE_PERMISSIONS_MESSAGE)
            setShowOpenHealthConnectSettings(true)
            return
          }
          throw syncErr
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
    } catch (err) {
      if (!feedback) {
        const code = capacitorErrorCode(err)
        if (code === 'health_connect_permissions' || code === 'health_connect_open_settings_failed') {
          setFeedback(HC_INCOMPLETE_PERMISSIONS_MESSAGE)
          setShowOpenHealthConnectSettings(true)
        } else {
          const msg = err instanceof Error ? err.message : ''
          setFeedback(msg ? `Health Connect error: ${msg}` : 'Health Connect error. Please try again.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const buttonText = !isConnected ? 'Connect Health Connect' : 'Sync now'
  const helperText = !isConnected
    ? 'Connect to Health Connect to sync your steps, sleep, and heart rate.'
    : 'Your Health Connect data is linked. Tap to sync latest data.'
  const isButtonDisabled = loading

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
        <p
          className={`mt-2 text-xs font-medium leading-relaxed ${
            feedback === HC_INCOMPLETE_PERMISSIONS_MESSAGE ||
            showOpenHealthConnectSettings ||
            feedback.includes('return here')
              ? 'text-amber-800 dark:text-amber-200'
              : 'text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {feedback}
        </p>
      ) : null}

      {isAndroidNative && showOpenHealthConnectSettings ? (
        <button
          type="button"
          onClick={() => void openHealthConnectAppSettings()}
          className="mt-2 w-full rounded-lg border border-sky-600 bg-white px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-500 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800"
        >
          Open Health Connect settings
        </button>
      ) : null}

      {process.env.NODE_ENV !== 'production' && debugStatus ? (
        <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-slate-950/95 p-2 text-[10px] leading-snug text-slate-100">
{JSON.stringify(debugStatus, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}

