/**
 * Event notification scheduling and management
 */

export type NotificationConfig = {
  type: 'before' | 'at'
  value: string // minutes before (for 'before') or empty (for 'at')
}

export type EventNotification = {
  eventId: string
  eventTitle: string
  eventStart: Date
  notificationTime: Date
  config: NotificationConfig
}

/**
 * Request notification permission from the browser
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('[notifications] Browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    console.warn('[notifications] Notification permission denied')
    return false
  }

  // Request permission
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

/**
 * Calculate notification time based on event start and notification config
 */
export function calculateNotificationTime(
  eventStart: Date,
  config: NotificationConfig
): Date {
  const notificationTime = new Date(eventStart)

  if (config.type === 'before') {
    const minutesBefore = parseInt(config.value, 10)
    if (!isNaN(minutesBefore)) {
      notificationTime.setMinutes(notificationTime.getMinutes() - minutesBefore)
    }
  }
  // For 'at' type, notificationTime is the same as eventStart

  return notificationTime
}

/**
 * Schedule a browser notification
 */
export function scheduleNotification(
  eventTitle: string,
  notificationTime: Date,
  eventStart: Date
): number | null {
  const now = new Date()
  const delay = notificationTime.getTime() - now.getTime()

  // Don't schedule if notification time is in the past
  if (delay < 0) {
    console.log('[notifications] Notification time is in the past, skipping')
    return null
  }

  // Don't schedule if delay is too far in the future (more than 1 year)
  // Browser timeouts have limits
  if (delay > 365 * 24 * 60 * 60 * 1000) {
    console.log('[notifications] Notification too far in future, will need to reschedule')
    return null
  }

  const timeoutId = setTimeout(() => {
    if (Notification.permission === 'granted') {
      const isAtEventTime = notificationTime.getTime() === eventStart.getTime()
      const message = isAtEventTime
        ? `${eventTitle} is starting now`
        : `${eventTitle} starts ${formatTimeUntil(notificationTime, eventStart)}`

      new Notification('Shift Coach Event', {
        body: message,
        icon: '/bubble-icon.png',
        badge: '/bubble-icon.png',
        tag: `event-${eventStart.getTime()}`,
        requireInteraction: false,
      })
    }
  }, delay)

  return timeoutId as unknown as number
}

/**
 * Format time until event (e.g., "in 15 minutes", "in 1 hour", "in 1 day")
 */
function formatTimeUntil(notificationTime: Date, eventStart: Date): string {
  const diffMs = eventStart.getTime() - notificationTime.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 60) {
    return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`
  }

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
}

/**
 * Schedule all notifications for an event
 */
export function scheduleEventNotifications(
  eventTitle: string,
  eventStart: Date,
  notificationConfigs: NotificationConfig[]
): number[] {
  const timeoutIds: number[] = []

  notificationConfigs.forEach((config) => {
    const notificationTime = calculateNotificationTime(eventStart, config)
    const timeoutId = scheduleNotification(eventTitle, notificationTime, eventStart)
    if (timeoutId !== null) {
      timeoutIds.push(timeoutId)
    }
  })

  return timeoutIds
}

/**
 * Cancel scheduled notifications
 */
export function cancelScheduledNotifications(timeoutIds: number[]): void {
  timeoutIds.forEach((id) => {
    clearTimeout(id)
  })
}

