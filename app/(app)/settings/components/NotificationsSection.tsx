'use client'

import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { ChevronRight } from 'lucide-react'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'
import { useSettings } from '@/lib/hooks/useSettings'
import { useTranslation } from '@/components/providers/language-provider'

type DebugNotificationItem = {
  id: number
  title: string
  body: string
  at: string
}

const isDev =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

export function NotificationsSection() {
  const { t } = useTranslation()
  const { settings, saving, saveField, loading } = useSettings()
  const [reminderCount, setReminderCount] = useState<number | null>(null)
  const [permissionState, setPermissionState] = useState<
    'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unknown'
  >('unknown')
  const [pendingNotifications, setPendingNotifications] = useState<DebugNotificationItem[]>([])
  const [debugLoading, setDebugLoading] = useState(false)
  const isNative = Capacitor.isNativePlatform()

  const refreshFromDevice = useCallback(async () => {
    if (!isNative) {
      setReminderCount(null)
      return
    }
    setDebugLoading(true)
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const pending = await LocalNotifications.getPending()
      const notifications = pending.notifications ?? []
      setReminderCount(notifications.length)

      if (!isDev) return

      const permission = await LocalNotifications.checkPermissions()
      setPermissionState(permission.display ?? 'unknown')

      const mapped = notifications
        .map((item) => {
          const scheduleAt = item.schedule?.at
          const at =
            scheduleAt instanceof Date
              ? scheduleAt
              : typeof scheduleAt === 'string'
                ? new Date(scheduleAt)
                : null
          return {
            id: item.id,
            title: item.title ?? 'Untitled',
            body: item.body ?? '',
            at:
              at && !Number.isNaN(at.getTime())
                ? at.toLocaleString()
                : 'No schedule time',
          }
        })
        .sort((a, b) => a.at.localeCompare(b.at))
      setPendingNotifications(mapped)
    } catch {
      setReminderCount(null)
      setPermissionState('unknown')
      setPendingNotifications([])
    } finally {
      setDebugLoading(false)
    }
  }, [isNative])

  useEffect(() => {
    void refreshFromDevice()
  }, [refreshFromDevice])

  if (loading) {
    return (
      <div>
        <div className="animate-pulse text-xs text-slate-500">{t('settings.notifications.loading')}</div>
      </div>
    )
  }

  const safeSettings = settings || {
    mood_focus_alerts_enabled: true,
  }

  const notificationsEnabled = safeSettings.mood_focus_alerts_enabled ?? true

  const handleToggleChange = (checked: boolean) => {
    saveField('mood_focus_alerts_enabled', checked, false)
  }

  const handleToggleSave = async (): Promise<boolean> => true

  const reminderSubtitle =
    isNative && typeof reminderCount === 'number'
      ? reminderCount === 1
        ? t('settings.notifications.scheduledLineOne')
        : t('settings.notifications.scheduledLine', { count: reminderCount })
      : isNative && debugLoading
        ? t('settings.notifications.scheduledLoading')
        : !isNative
          ? t('settings.notifications.scheduledWeb')
          : null

  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="group flex items-center justify-between gap-3 px-4 py-3 hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-400 grid place-items-center flex-shrink-0 shadow-sm">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-slate-900">{t('settings.notifications.title')}</h3>
            <p className="mt-0.5 text-xs text-slate-500 leading-snug">{t('settings.notifications.subtitle')}</p>
            {reminderSubtitle ? (
              <p className="mt-1 text-xs font-medium text-slate-600">{reminderSubtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ToggleSwitch
            checked={notificationsEnabled}
            onChange={handleToggleChange}
            onSave={handleToggleSave}
            saving={saving === 'mood_focus_alerts_enabled'}
          />
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition flex-shrink-0" strokeWidth={2} />
        </div>
      </div>

      {isDev && isNative ? (
        <div className="border-t border-slate-100 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Debug · notifications</p>
            <button
              type="button"
              onClick={() => void refreshFromDevice()}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              Refresh
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Permission: <span className="font-semibold text-slate-900">{permissionState}</span>
          </p>
          {debugLoading ? (
            <p className="text-xs text-slate-500">Loading…</p>
          ) : pendingNotifications.length > 0 ? (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
              {pendingNotifications.slice(0, 16).map((item) => (
                <div key={item.id} className="py-1 text-[11px] text-slate-700">
                  <span className="font-semibold">#{item.id}</span> {item.title} — {item.at}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No pending notifications scheduled.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
