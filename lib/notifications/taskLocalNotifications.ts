import { Capacitor } from '@capacitor/core'

/** Stable IDs for Capacitor local notifications (per saved task). */
export function taskNotificationIds(taskId: number) {
  const base = 1_000_000 + taskId * 2
  return { before1h: base, atStart: base + 1 }
}

export async function cancelTaskReminders(taskId: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { before1h, atStart } = taskNotificationIds(taskId)
    await LocalNotifications.cancel({
      notifications: [{ id: before1h }, { id: atStart }],
    })
  } catch (e) {
    console.warn('[task notifications] cancel failed', e)
  }
}

/**
 * Schedule local notifications on the device: 1 hour before start, and at start.
 * No-op on web. Uses @capacitor/local-notifications (native only).
 */
export async function scheduleTaskReminders(params: {
  taskId: number
  title: string
  description?: string
  startSec: number
  /** Localized notification title (1 hour before) */
  titleBefore1h: string
  /** Localized notification title (at start time) */
  titleAtStart: string
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const { taskId, title, description, startSec, titleBefore1h, titleAtStart } = params
  const startMs = startSec * 1000
  const now = Date.now()
  if (startMs <= now) return

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions()
      if (req.display !== 'granted') return
    }

    const { before1h, atStart } = taskNotificationIds(taskId)
    await cancelTaskReminders(taskId)

    const notifications: {
      id: number
      title: string
      body: string
      schedule: { at: Date }
      extra?: Record<string, unknown>
    }[] = []

    const oneHourMs = startMs - 60 * 60 * 1000
    if (oneHourMs > now) {
      notifications.push({
        id: before1h,
        title: titleBefore1h,
        body: title,
        schedule: { at: new Date(oneHourMs) },
        extra: { taskId, kind: 'before' },
      })
    }

    notifications.push({
      id: atStart,
      title: titleAtStart,
      body: description?.trim() ? `${title} — ${description.trim()}` : title,
      schedule: { at: new Date(startMs) },
      extra: { taskId, kind: 'start' },
    })

    await LocalNotifications.schedule({ notifications })
  } catch (e) {
    console.warn('[task notifications] schedule failed', e)
  }
}
