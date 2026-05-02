'use client'

import { useCallback, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import type { HcLauncherDiagnostics, ShiftCoachHealthConnectPlugin } from '@/lib/native/shiftCoachHealthConnect'

const isProdBuild = process.env.NODE_ENV === 'production'

type Status = Awaited<ReturnType<ShiftCoachHealthConnectPlugin['getStatus']>>

/**
 * Dev-only: native Health Connect diagnostics. Hidden entirely in production (Next + native release).
 */
export function HealthConnectNativeDebugPanel() {
  const [status, setStatus] = useState<Status | null>(null)
  const [lastPerm, setLastPerm] = useState<
    Awaited<ReturnType<ShiftCoachHealthConnectPlugin['requestConnectPermissions']>> | null
  >(null)
  const [lastErr, setLastErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isAndroidNative = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()

  const refresh = useCallback(async () => {
    setBusy(true)
    setLastErr(null)
    try {
      const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
      const s = await ShiftCoachHealthConnect.getStatus()
      setStatus(s)
      console.info('[ShiftCoach HC debug] getStatus', s)
    } catch (e) {
      setLastErr(String(e))
      console.warn('[ShiftCoach HC debug] getStatus failed', e)
    } finally {
      setBusy(false)
    }
  }, [])

  const requestPerms = useCallback(async () => {
    setBusy(true)
    setLastErr(null)
    try {
      const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
      const r = await ShiftCoachHealthConnect.requestConnectPermissions()
      setLastPerm(r)
      const s = await ShiftCoachHealthConnect.getStatus()
      setStatus(s)
      console.info('[ShiftCoach HC debug] requestConnectPermissions', r)
    } catch (e) {
      setLastErr(String(e))
      console.warn('[ShiftCoach HC debug] requestConnectPermissions failed', e)
    } finally {
      setBusy(false)
    }
  }, [])

  const openSettings = useCallback(async () => {
    setBusy(true)
    setLastErr(null)
    try {
      const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
      await ShiftCoachHealthConnect.openPermissionSettings()
      await refresh()
    } catch (e) {
      setLastErr(String(e))
    } finally {
      setBusy(false)
    }
  }, [refresh])

  const runNativeSync = useCallback(async () => {
    setBusy(true)
    setLastErr(null)
    try {
      const { prepareHealthConnectNativeAuth } = await import('@/lib/native/prepareHealthConnectNativeAuth')
      const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
      const authOk = await prepareHealthConnectNativeAuth()
      if (!authOk) {
        setLastErr('No Supabase session token (hydrate + getSession + refreshSession). Sign in again.')
        return
      }
      if (!isProdBuild) {
        console.info('[HealthConnect] calling syncNow')
      }
      const r = await ShiftCoachHealthConnect.syncNow()
      console.info('[ShiftCoach HC debug] syncNow', r)
      await refresh()
    } catch (e) {
      setLastErr(String(e))
      console.warn('[ShiftCoach HC debug] syncNow failed', e)
    } finally {
      setBusy(false)
    }
  }, [refresh])

  const diag = status?.hcDiagnostics
  const launcherDiag = status?.hcLauncherDiagnostics as HcLauncherDiagnostics | undefined

  const summary = useMemo(() => {
    if (!status) return null
    return {
      sdkStatus: status.sdkStatus,
      requiredPermissions: status.requiredPermissions,
      grantedPermissions: status.grantedPermissions,
      missingPermissions: status.missingPermissions,
      permissionFlowReady: status.permissionFlowReady,
      hcLauncherDiagnostics: launcherDiag,
      launchCalled: launcherDiag?.launchCalled ?? diag?.launchCalled,
      callbackFired: launcherDiag?.callbackFired ?? diag?.callbackFired,
      lastNativeError: launcherDiag?.lastNativeError ?? diag?.lastNativeError ?? lastErr,
      lastRegistrationError: launcherDiag?.lastRegistrationError,
      lastLaunchError: launcherDiag?.lastLaunchError,
      appVersion: diag?.appVersionName != null ? `${diag.appVersionName} (${diag.appVersionCode})` : undefined,
    }
  }, [status, diag, launcherDiag, lastErr])

  if (isProdBuild) return null
  if (!isAndroidNative) return null

  return (
    <div className="mt-4 rounded-lg border border-dashed border-amber-600/50 bg-amber-950/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">Dev only — Health Connect native</p>
      <p className="mt-1 text-[10px] text-amber-100/80">
        Logcat (debug builds):{' '}
        <code className="rounded bg-black/30 px-1">adb logcat | findstr ShiftCoachHC</code> (Windows) or{' '}
        <code className="rounded bg-black/30 px-1">adb logcat | grep ShiftCoachHC</code>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
          className="rounded-md bg-amber-700 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Refresh HC status
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void requestPerms()}
          className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Request HC permissions
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void openSettings()}
          className="rounded-md bg-amber-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Open HC settings
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runNativeSync()}
          className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Run native HC sync
        </button>
      </div>
      {summary ? (
        <dl className="mt-3 grid grid-cols-1 gap-1 text-[10px] text-amber-50/95 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-amber-200/90">SDK status</dt>
            <dd className="font-mono">{String(summary.sdkStatus)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-amber-200/90">Launcher registered</dt>
            <dd className="font-mono">{String(summary.permissionFlowReady)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-amber-200/90">Launch called (native)</dt>
            <dd className="font-mono">{String(summary.launchCalled)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-amber-200/90">Callback fired (native)</dt>
            <dd className="font-mono">{String(summary.callbackFired)}</dd>
          </div>
          {summary.appVersion ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-amber-200/90">App version</dt>
              <dd className="font-mono">{summary.appVersion}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="font-semibold text-amber-200/90">Required permissions</dt>
            <dd className="break-all font-mono">{JSON.stringify(summary.requiredPermissions)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-semibold text-amber-200/90">Granted</dt>
            <dd className="break-all font-mono">{JSON.stringify(summary.grantedPermissions)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-semibold text-amber-200/90">Missing</dt>
            <dd className="break-all font-mono">{JSON.stringify(summary.missingPermissions)}</dd>
          </div>
          {lastPerm ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-amber-200/90">Last requestConnectPermissions</dt>
              <dd className="break-all font-mono">{JSON.stringify(lastPerm)}</dd>
            </div>
          ) : null}
          {summary.hcLauncherDiagnostics ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-amber-200/90">hcLauncherDiagnostics</dt>
              <dd className="break-all font-mono">{JSON.stringify(summary.hcLauncherDiagnostics)}</dd>
            </div>
          ) : null}
          {summary.lastRegistrationError ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-rose-200/90">lastRegistrationError</dt>
              <dd className="max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-rose-100/90">
                {String(summary.lastRegistrationError)}
              </dd>
            </div>
          ) : null}
          {summary.lastLaunchError ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-rose-200/90">lastLaunchError</dt>
              <dd className="max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-rose-100/90">
                {String(summary.lastLaunchError)}
              </dd>
            </div>
          ) : null}
          {summary.lastNativeError ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-rose-200/90">Last native error</dt>
              <dd className="max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-rose-100/90">
                {String(summary.lastNativeError)}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-2 text-[10px] text-amber-100/70">Tap Refresh HC status to load native state.</p>
      )}
    </div>
  )
}
