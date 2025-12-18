'use client'

import { useEffect, useRef } from 'react'
import {
  requestNotificationPermission,
  scheduleEventNotifications,
  cancelScheduledNotifications,
  type NotificationConfig,
} from '@/lib/notifications/eventNotifications'

/**
 * Hook to manage event notifications
 * Schedules browser notifications for events
 */
export function useEventNotifications() {
  const scheduledTimeoutsRef = useRef<number[]>([])
  const permissionRequestedRef = useRef(false)

  // Request permission on mount
  useEffect(() => {
    if (!permissionRequestedRef.current) {
      requestNotificationPermission().then((granted) => {
        if (granted) {
          console.log('[useEventNotifications] Notification permission granted')
        } else {
          console.warn('[useEventNotifications] Notification permission not granted')
        }
        permissionRequestedRef.current = true
      })
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelScheduledNotifications(scheduledTimeoutsRef.current)
      scheduledTimeoutsRef.current = []
    }
  }, [])

  const scheduleNotifications = (
    eventTitle: string,
    eventStart: Date,
    notificationConfigs: NotificationConfig[]
  ) => {
    // Cancel any existing notifications
    cancelScheduledNotifications(scheduledTimeoutsRef.current)
    scheduledTimeoutsRef.current = []

    // Request permission if not already granted
    requestNotificationPermission().then((granted) => {
      if (!granted) {
        console.warn('[useEventNotifications] Cannot schedule notifications without permission')
        return
      }

      // Schedule new notifications
      const timeoutIds = scheduleEventNotifications(
        eventTitle,
        eventStart,
        notificationConfigs
      )
      scheduledTimeoutsRef.current = timeoutIds
      console.log('[useEventNotifications] Scheduled', timeoutIds.length, 'notifications')
    })
  }

  return {
    scheduleNotifications,
    requestPermission: requestNotificationPermission,
  }
}

