/**
 * Schedules browser notifications for active shift transitions (userShiftState.activeTransition).
 * Integrates with the same Web Notification stack as `eventNotifications.ts`.
 */
import { Capacitor } from '@capacitor/core'
import type { UserShiftState } from '@/lib/shift-agent/types'
import { cancelScheduledNotifications } from '@/lib/notifications/eventNotifications'
import { isTransitionPlanPanelVisible } from '@/lib/notifications/transitionAlertVisibility'
import { ensureLocalNotificationChannel } from '@/lib/notifications/nativeLocalNotifications'

const MS_H = 60 * 60 * 1000
const STORAGE_KEY = 'shiftcoach-transition-alerts-sent-v1'
const MAX_STORED_IDS = 80

/** In-flight timeouts for the current transition batch (cancel on rota / state change). */
let activeTimeoutIds: number[] = []

function notificationIdFromKey(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return 400_000_000 + (Math.abs(hash) % 500_000_000)
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
    const s = loadSentIds()
    s.add(id)
    const list = [...s]
    const trimmed =
      list.length > MAX_STORED_IDS ? list.slice(list.length - MAX_STORED_IDS) : list
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // non-critical
  }
}

function shouldSuppressBecauseUserIsViewingPlan(): boolean {
  if (typeof document === 'undefined') return false
  if (document.visibilityState !== 'visible') return false
  return isTransitionPlanPanelVisible()
}

export type BuiltTransitionAlert = {
  stableId: string
  fireAt: Date
  title: string
  body: string
  requireInteraction: boolean
}

function severityKey(sev: string): string {
  return String(sev).toLowerCase()
}

/**
 * Pure planner for tests: all times relative to `activeTransition.nextShiftStart`.
 */
export function buildTransitionAlerts(
  state: UserShiftState | null,
  now: Date,
): BuiltTransitionAlert[] {
  if (!state?.activeTransition) return []

  const t = state.activeTransition
  const next = t.nextShiftStart
  if (!next || Number.isNaN(next.getTime())) return []

  const sev = severityKey(t.severity)
  const isHighOrCritical = sev === 'high' || sev === 'critical'

  const out: BuiltTransitionAlert[] = []
  const base = next.getTime()

  const add = (
    offsetMsFromNext: number,
    slot: string,
    title: string,
    body: string,
    requireInteraction = false,
  ) => {
    const fireAt = new Date(base + offsetMsFromNext)
    if (fireAt.getTime() <= now.getTime()) return
    const stableId = `transition-${base}-${slot}`
    out.push({ stableId, fireAt, title, body, requireInteraction })
  }

  // T-24h
  add(
    -24 * MS_H,
    't24h',
    'Shift Coach',
    'Your shift pattern changes tomorrow — I\'ve updated your plan',
  )

  // T-9h (only high / critical)
  if (isHighOrCritical) {
    add(
      -9 * MS_H,
      't9h',
      'Shift Coach',
      'Today\'s the flip day. Here\'s your plan to get through it well.',
    )
  }

  // T-5h — nap (only when recommended)
  if (t.napRecommended && state.sleepWindows.napWindow) {
    const napEnd = state.sleepWindows.napWindow.end
    const endStr = napEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const persistent = sev === 'critical'
    add(
      -5 * MS_H,
      't5h-nap',
      'Shift Coach',
      `Nap window is open now. 90 mins max, finish by ${endStr}. This carries you through tonight.`,
      persistent,
    )
  }

  // T-2h — anchor meal
  const anchorStr = state.mealWindows.anchorMeal.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  add(
    -2 * MS_H,
    't2h-anchor',
    'Shift Coach',
    `Time for your anchor meal before your shift. ${anchorStr} — protein and complex carbs.`,
  )

  // T-1h
  add(-1 * MS_H, 't1h', 'Shift Coach', 'One hour to go — you\'ve got this.')

  return out
}

export function cancelScheduledTransitionAlerts(): void {
  cancelScheduledNotifications(activeTimeoutIds)
  activeTimeoutIds = []
}

export type ScheduleTransitionAlertsOptions = {
  now?: Date
}

/**
 * Cancels any prior transition timeouts, then schedules alerts from current `userShiftState`.
 * Call when `userShiftState` updates (including after rota changes).
 */
export function scheduleTransitionAlerts(
  state: UserShiftState | null,
  opts: ScheduleTransitionAlertsOptions = {},
): void {
  cancelScheduledTransitionAlerts()

  if (typeof window === 'undefined') return

  const now = opts.now ?? new Date()
  const alerts = buildTransitionAlerts(state, now)
  if (!alerts.length) return

  if (Capacitor.isNativePlatform()) {
    void (async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        const perm = await LocalNotifications.checkPermissions()
        if (perm.display !== 'granted') return
        const channelId = await ensureLocalNotificationChannel()

        const nativeNotifications = alerts
          .map((a) => {
            const delay = a.fireAt.getTime() - now.getTime()
            if (delay < 0 || delay > 365 * 24 * 60 * 60 * 1000) return null
            return {
              id: notificationIdFromKey(a.stableId),
              title: a.title,
              body: a.body,
              schedule: { at: a.fireAt },
              channelId,
            }
          })
          .filter((n): n is { id: number; title: string; body: string; schedule: { at: Date }; channelId?: string } => n !== null)

        if (!nativeNotifications.length) return
        await LocalNotifications.schedule({ notifications: nativeNotifications })
      } catch {
        // ignore
      }
    })()
    return
  }

  if (!('Notification' in window)) return
  const sent = loadSentIds()

  for (const a of alerts) {
    if (sent.has(a.stableId)) continue

    const delay = a.fireAt.getTime() - now.getTime()
    if (delay < 0) continue
    if (delay > 365 * 24 * 60 * 60 * 1000) continue

    const timeoutId = window.setTimeout(() => {
      if (shouldSuppressBecauseUserIsViewingPlan()) {
        return
      }
      if (Notification.permission !== 'granted') return
      if (loadSentIds().has(a.stableId)) return

      try {
        new Notification(a.title, {
          body: a.body,
          icon: '/bubble-icon.png',
          badge: '/bubble-icon.png',
          tag: a.stableId,
          requireInteraction: a.requireInteraction,
        })
        markAlertSent(a.stableId)
      } catch {
        // ignore
      }
    }, delay)

    activeTimeoutIds.push(timeoutId)
  }
}
