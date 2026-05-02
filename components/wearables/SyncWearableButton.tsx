'use client'

import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import type { ShiftCoachHealthConnectPlugin } from '@/lib/native/shiftCoachHealthConnect'

const ANDROID_HEALTH_PROVIDER = 'android_health_connect'

const isDevBuild = process.env.NODE_ENV !== 'production'

const HC_UNAVAILABLE =
  'Health Connect is not available on this device. Install or update Health Connect, then try again.'

/** Shown when the user cancels, denies, or leaves the HC dialog without all required reads. */
const HC_INCOMPLETE_PERMISSIONS_MESSAGE =
  'Permission was not completed. Open Health Connect and allow Steps, Sleep, and Heart Rate for ShiftCoach.'

const HC_CONNECTED =
  'Connected to Health Connect. ShiftCoach can read Steps, Sleep, and Heart Rate.'

const HC_NO_RECENT_DATA =
  'Health Connect is connected, but no recent data was found. Make sure Samsung Health or Google Fit is writing data to Health Connect.'

const HC_SETTINGS_OPEN_FAILED =
  'Could not open Health Connect settings. Open Android Settings, search for Health Connect, then allow data access for ShiftCoach.'

const SAMSUNG_HC_SOURCE_NOTE =
  'Samsung Health, Google Fit, or your watch app must be allowed to write steps, sleep, and heart rate into Health Connect. ShiftCoach only reads those types once they appear in Health Connect.'

const HC_PERMISSION_LAUNCHER_BROKEN =
  'Health Connect is available, but this build could not attach the permission screen. Please reinstall the app or contact support, and send a screenshot of the debug panel below if shown.'

const HC_INSTALL_HINT =
  'Health Connect is not installed or needs an update. Tap Get Health Connect to open Google Play, install or update, then return here and tap Connect again.'

function capacitorErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: string }).code
    return typeof c === 'string' ? c : ''
  }
  return ''
}

function asStringArray(v: unknown): string[] | undefined {
  if (v == null) return undefined
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
  if (typeof v === 'object')
    return Object.values(v as Record<string, unknown>).filter((x): x is string => typeof x === 'string')
  return undefined
}

const HC_PERM_LABEL: Record<string, string> = {
  'android.permission.health.READ_STEPS': 'Steps',
  'android.permission.health.READ_SLEEP': 'Sleep',
  'android.permission.health.READ_HEART_RATE': 'Heart Rate',
}

function formatMissingLabels(missing: string[] | undefined): string {
  if (!missing?.length) return 'Steps, Sleep, and Heart Rate'
  const labels = missing.map((p) => HC_PERM_LABEL[p] ?? p)
  return labels.join(', ')
}

function buildPartialPermissionMessage(missing: string[] | undefined): string {
  return `Some permissions are missing: ${formatMissingLabels(missing)}. Open Health Connect and allow the missing permissions.`
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

function isWarningFeedback(
  feedback: string | null,
  showOpenHealthConnectSettings: boolean,
): boolean {
  if (!feedback) return showOpenHealthConnectSettings
  if (showOpenHealthConnectSettings) return true
  return (
    feedback.includes('Permission was not completed') ||
    feedback.includes('Some permissions are missing') ||
    feedback.includes('Could not open Health Connect settings') ||
    feedback.includes('return here and tap') ||
    feedback.includes('Health Connect is not available') ||
    feedback.includes('Install or update Health Connect') ||
    feedback.includes('Google Play') ||
    feedback.includes('not installed or needs an update') ||
    feedback.includes('no recent data was found')
  )
}

export default function SyncWearableButton() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showOpenHealthConnectSettings, setShowOpenHealthConnectSettings] = useState(false)
  const [isAndroidNative, setIsAndroidNative] = useState(false)
  const [hasHealthConnectAvailable, setHasHealthConnectAvailable] = useState(false)
  const [debugStatus, setDebugStatus] = useState<Awaited<ReturnType<ShiftCoachHealthConnectPlugin['getStatus']>> | null>(
    null,
  )
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
      setFeedback(HC_SETTINGS_OPEN_FAILED)
    }
  }

  async function openHealthConnectInstallPage() {
    try {
      const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
      await ShiftCoachHealthConnect.openHealthConnectInstallPage()
      setFeedback('After Health Connect is installed or updated, return here and tap Connect Health Connect.')
    } catch (e) {
      console.warn('[SyncWearableButton] openHealthConnectInstallPage', e)
      setFeedback('Could not open Google Play. Open the Play Store app and search for “Health Connect”.')
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
        if (isDevBuild) {
          console.info('[ShiftCoach HC] getStatus', nativeStatus)
        }

        const available = nativeStatus.canCreateClient === true || nativeStatus.available

        if (available && nativeStatus.permissionFlowReady === false) {
          setFeedback(HC_PERMISSION_LAUNCHER_BROKEN)
          return
        }

        if (!available) {
          setFeedback(HC_UNAVAILABLE)
          return
        }

        if (!nativeStatus.hasPermissions) {
          try {
            const permission = await ShiftCoachHealthConnect.requestConnectPermissions()
            if (isDevBuild) {
              console.info('[ShiftCoach HC] requestConnectPermissions result', permission)
            }

            if (permission.sdkUnavailable) {
              setFeedback(HC_INSTALL_HINT)
              return
            }

            if (!permission.granted) {
              const missing = asStringArray(permission.missingPermissions)
              const partial =
                permission.permissionResult === 'partial' && missing != null && missing.length > 0
              setFeedback(partial ? buildPartialPermissionMessage(missing) : HC_INCOMPLETE_PERMISSIONS_MESSAGE)
              setShowOpenHealthConnectSettings(true)
              return
            }

            const refreshed = await ShiftCoachHealthConnect.getStatus()
            setDebugStatus(refreshed)
          } catch (permErr) {
            console.warn('[SyncWearableButton] requestConnectPermissions', permErr)
            setFeedback(HC_INCOMPLETE_PERMISSIONS_MESSAGE)
            setShowOpenHealthConnectSettings(true)
            return
          }

          setIsConnected(true)
          setFeedback(HC_CONNECTED)
        }

        try {
          const syncResult = await ShiftCoachHealthConnect.syncNow()
          if (isDevBuild) {
            console.info('[ShiftCoach HC] syncNow', syncResult)
          }
          if (syncResult.ok) {
            const ts = syncResult.lastSyncedAt ? new Date(syncResult.lastSyncedAt).getTime() : Date.now()
            localStorage.setItem('wearables:lastSyncedAt', String(ts))
            window.dispatchEvent(new CustomEvent('wearables-synced', { detail: { ts } }))
            setIsConnected(true)
            if (syncResult.recentDataLikelyEmpty) {
              setFeedback(HC_NO_RECENT_DATA)
            } else if (isConnected) {
              setFeedback('Synced successfully.')
            } else {
              setFeedback(HC_CONNECTED)
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
      const code = capacitorErrorCode(err)
      if (code === 'health_connect_permissions' || code === 'health_connect_open_settings_failed') {
        setFeedback(
          code === 'health_connect_open_settings_failed'
            ? HC_SETTINGS_OPEN_FAILED
            : HC_INCOMPLETE_PERMISSIONS_MESSAGE,
        )
        setShowOpenHealthConnectSettings(true)
      } else {
        const msg = err instanceof Error ? err.message : ''
        setFeedback(msg ? `Health Connect error: ${msg}` : 'Health Connect error. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const buttonText = !isConnected ? 'Connect Health Connect' : 'Sync now'
  const helperText =
    isAndroidNative && hasHealthConnectAvailable
      ? !isConnected
        ? 'Tap Connect — Android opens Health Connect and asks for Steps, Sleep, and Heart Rate. You can change this later in Health Connect settings.'
        : 'Health Connect is linked. Tap to sync the latest Steps, Sleep, and Heart Rate.'
      : !isConnected
        ? 'Connect to Health Connect to sync Steps, Sleep, and Heart Rate.'
        : 'Health Connect is linked. Tap to sync the latest Steps, Sleep, and Heart Rate.'
  const isButtonDisabled = loading
  const warnStyle = isWarningFeedback(feedback, showOpenHealthConnectSettings)

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

      {isAndroidNative ? (
        <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{SAMSUNG_HC_SOURCE_NOTE}</p>
      ) : null}

      {isAndroidNative &&
      debugStatus?.available === true &&
      debugStatus?.permissionFlowReady === false ? (
        <p className="mt-2 text-xs font-medium text-rose-800 dark:text-rose-200">{HC_PERMISSION_LAUNCHER_BROKEN}</p>
      ) : null}

      {isAndroidNative && !hasHealthConnectAvailable ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-amber-700 dark:text-amber-300">{HC_INSTALL_HINT}</p>
          <button
            type="button"
            onClick={() => void openHealthConnectInstallPage()}
            className="w-full rounded-lg border border-amber-700/50 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/70"
          >
            Get Health Connect (Google Play)
          </button>
        </div>
      ) : null}

      {feedback ? (
        <p
          className={`mt-2 text-xs font-medium leading-relaxed ${
            warnStyle ? 'text-amber-800 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-300'
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

    </div>
  )
}
