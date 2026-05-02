'use client'

import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import type { ShiftCoachHealthConnectPlugin } from '@/lib/native/shiftCoachHealthConnect'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Dev-only: calls native ShiftCoachHealthConnect directly for logcat + raw JSON inspection.
 * Hidden in production builds.
 */
export function HealthConnectNativeDebugPanel() {
  const [out, setOut] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!isDev) return null

  const isAndroidNative = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
  if (!isAndroidNative) return null

  async function runGetStatus() {
    setBusy(true)
    setOut(null)
    try {
      const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
      const s = await ShiftCoachHealthConnect.getStatus()
      setOut(JSON.stringify(s, null, 2))
      console.info('[ShiftCoach HC debug] getStatus', s)
    } catch (e) {
      setOut(String(e))
      console.warn('[ShiftCoach HC debug] getStatus failed', e)
    } finally {
      setBusy(false)
    }
  }

  async function runRequestPermissions() {
    setBusy(true)
    setOut(null)
    try {
      const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
      const r: Awaited<ReturnType<ShiftCoachHealthConnectPlugin['requestConnectPermissions']>> =
        await ShiftCoachHealthConnect.requestConnectPermissions()
      setOut(JSON.stringify(r, null, 2))
      console.info('[ShiftCoach HC debug] requestConnectPermissions', r)
    } catch (e) {
      setOut(String(e))
      console.warn('[ShiftCoach HC debug] requestConnectPermissions failed', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-amber-600/50 bg-amber-950/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">Dev only — Health Connect native</p>
      <p className="mt-1 text-[10px] text-amber-100/80">
        Filter logcat: <code className="rounded bg-black/30 px-1">adb logcat | findstr ShiftCoachHC</code> (Windows) or{' '}
        <code className="rounded bg-black/30 px-1">adb logcat | grep ShiftCoachHC</code>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runGetStatus()}
          className="rounded-md bg-amber-700 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Debug: get HC status
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runRequestPermissions()}
          className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Debug: request HC permissions
        </button>
      </div>
      {out ? (
        <pre className="mt-2 max-h-56 overflow-auto rounded bg-black/40 p-2 text-[10px] leading-snug text-amber-50">{out}</pre>
      ) : null}
    </div>
  )
}
