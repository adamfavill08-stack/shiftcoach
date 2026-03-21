'use client'

import { useEffect } from 'react'
import { useEventNotifications } from '@/lib/hooks/useEventNotifications'
import { loadAndScheduleEventNotifications } from '@/lib/notifications/loadEventNotifications'

/**
 * Component that loads and schedules event notifications on mount
 * Should be placed in the root layout or dashboard
 */
export function EventNotificationLoader() {
  const { requestPermission } = useEventNotifications()

  useEffect(() => {
    // Request permission and load notifications
    const init = async () => {
      const granted = await requestPermission()
      if (granted) {
        // Small delay to ensure app is fully loaded
        setTimeout(() => {
          loadAndScheduleEventNotifications()
        }, 1000)
      }
    }

    init()
  }, [requestPermission])

  return null // This component doesn't render anything
}

