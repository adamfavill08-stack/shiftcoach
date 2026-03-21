/**
 * Load events from API and schedule their notifications
 */

import type { NotificationConfig } from './eventNotifications'
import { scheduleEventNotifications } from './eventNotifications'

export async function loadAndScheduleEventNotifications() {
  try {
    // Get current month and next month to load upcoming events
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

    // Load events for current and next month
    const [currentRes, nextRes] = await Promise.all([
      fetch(`/api/rota/event?month=${currentMonth}&year=${currentYear}`, { cache: 'no-store' }),
      fetch(`/api/rota/event?month=${nextMonth}&year=${nextYear}`, { cache: 'no-store' }),
    ])

    const currentData = currentRes.ok ? await currentRes.json().catch(() => ({ events: [] })) : { events: [] }
    const nextData = nextRes.ok ? await nextRes.json().catch(() => ({ events: [] })) : { events: [] }

    const allEvents = [...(currentData.events || []), ...(nextData.events || [])]

    // Schedule notifications for each event
    allEvents.forEach((event: any) => {
      if (!event.start_at || !event.notification_config) return

      try {
        const notificationConfigs: NotificationConfig[] = JSON.parse(event.notification_config)
        const eventStart = new Date(event.start_at)
        const now = new Date()

        // Only schedule if event is in the future
        if (eventStart > now) {
          scheduleEventNotifications(event.title || 'Event', eventStart, notificationConfigs)
        }
      } catch (err) {
        console.warn('[loadEventNotifications] Failed to parse notification config for event', event.id, err)
      }
    })

    console.log('[loadEventNotifications] Scheduled notifications for', allEvents.length, 'events')
  } catch (err) {
    console.error('[loadEventNotifications] Error loading events', err)
  }
}

