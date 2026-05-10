import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'
import { getCircadianData } from '@/lib/circadian/circadianCache'
import { ensureLocalNotificationChannel } from '@/lib/notifications/nativeLocalNotifications'

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const STORAGE_KEY = 'shiftcoach-fatigue-alerts-sent-v1'
const MAX_SENT_IDS = 80

let activeFatigueAlertTimeoutId: number | null = null
let activeFatigueAlertNativeId: number | null = null

function notificationIdFromKey(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return 300_000_000 + (Math.abs(hash) % 600_000_000)
}

function loadSentIds(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x) => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function markAlertSent(id: string) {
  if (typeof localStorage === 'undefined') return
  try {
    const current = loadSentIds()
    current.add(id)
    const list = [...current]
    const trimmed = list.length > MAX_SENT_IDS ? list.slice(list.length - MAX_SENT_IDS) : list
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // non-critical
  }
}

function formatClockHour(value: number): string {
  const normalized = ((value % 24) + 24) % 24
  const hh = Math.floor(normalized)
  const mm = Math.round((normalized - hh) * 60)
  if (mm === 60) {
    return `${String((hh + 1) % 24).padStart(2, '0')}:00`
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function hoursUntil(fromHour: number, toHour: number): number {
  const delta = (((toHour % 24) - (fromHour % 24) + 24) % 24)
  return delta === 0 ? 24 : delta
}

function buildAdvice(fatigueScore: number): string {
  if (fatigueScore >= 70) {
    return 'Protect the next 2 hours: hydrate, avoid heavy decisions, and take a short recovery break if possible.'
  }
  if (fatigueScore >= 45) {
    return 'Pace your load now: hydrate, have a light protein snack, and avoid stacking demanding tasks.'
  }
  return 'You are approaching a lower-alertness window: take a short movement break and keep caffeine strategic.'
}

function nextTroughAlertDate(nextTroughHour: number, now: Date): Date {
  const currentHourFloat = now.getHours() + now.getMinutes() / 60
  const hrsUntilTrough = hoursUntil(currentHourFloat, nextTroughHour)
  const troughDate = new Date(now.getTime() + hrsUntilTrough * 60 * 60 * 1000)
  return new Date(troughDate.getTime() - 30 * MINUTE_MS)
}

export function cancelScheduledFatigueRiskAlerts(): void {
  if (activeFatigueAlertTimeoutId !== null) {
    window.clearTimeout(activeFatigueAlertTimeoutId)
    activeFatigueAlertTimeoutId = null
  }
  if (Capacitor.isNativePlatform() && activeFatigueAlertNativeId !== null) {
    const id = activeFatigueAlertNativeId
    activeFatigueAlertNativeId = null
    void (async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        await LocalNotifications.cancel({ notifications: [{ id }] })
      } catch {
        // non-critical
      }
    })()
  }
}

export async function scheduleFatigueRiskAlerts(): Promise<void> {
  cancelScheduledFatigueRiskAlerts()
  if (typeof window === 'undefined') return
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.checkPermissions()
      if (perm.display !== 'granted') return
    } catch {
      return
    }
  } else {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
  }

  try {
    const { data: auth } = await supabase.auth.getSession()
    const token = auth.session?.access_token
    if (!token) return

    const { circadian } = await getCircadianData(token)
    const nextTroughHour =
      circadian && typeof circadian.nextTroughHour === 'number' ? circadian.nextTroughHour : null
    if (nextTroughHour == null) return

    const now = new Date()
    const alertAt = nextTroughAlertDate(nextTroughHour, now)
    const delay = alertAt.getTime() - now.getTime()
    if (delay <= 0 || delay > DAY_MS) return

    const troughClock = formatClockHour(nextTroughHour)
    const dayKey = alertAt.toISOString().slice(0, 10)
    const stableId = `fatigue-risk-${dayKey}-${troughClock}`
    const nativeId = notificationIdFromKey(stableId)
    activeFatigueAlertNativeId = nativeId

    if (!Capacitor.isNativePlatform() && loadSentIds().has(stableId)) return

    const fatigueScore =
      circadian && typeof circadian.fatigueScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(circadian.fatigueScore)))
        : 50
    const advice = buildAdvice(fatigueScore)

    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        const channelId = await ensureLocalNotificationChannel()
        await LocalNotifications.schedule({
          notifications: [
            {
              id: nativeId,
              title: 'Shift Coach Fatigue Alert',
              body: `High-risk window around ${troughClock}. ${advice}`,
              schedule: { at: alertAt },
              channelId,
            },
          ],
        })
      } catch {
        // non-critical
      }
      return
    }

    activeFatigueAlertTimeoutId = window.setTimeout(() => {
      if (Notification.permission !== 'granted') return
      if (loadSentIds().has(stableId)) return
      try {
        new Notification('Shift Coach Fatigue Alert', {
          body: `High-risk window around ${troughClock}. ${advice}`,
          icon: '/bubble-icon.png',
          badge: '/bubble-icon.png',
          tag: stableId,
          requireInteraction: false,
        })
        markAlertSent(stableId)
      } catch {
        // non-critical
      }
    }, delay)
  } catch {
    // non-critical
  }
}
