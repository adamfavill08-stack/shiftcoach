'use client'

import { useEffect } from 'react'
import { useEventNotifications } from '@/lib/hooks/useEventNotifications'
import { loadAndScheduleEventNotifications } from '@/lib/notifications/loadEventNotifications'
import {
  cancelScheduledFatigueRiskAlerts,
  scheduleFatigueRiskAlerts,
} from '@/lib/notifications/scheduleFatigueRiskAlerts'

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
          void scheduleFatigueRiskAlerts()
        }, 1000)
      }
    }

    init()

    const onRefresh = () => {
      void scheduleFatigueRiskAlerts()
    }
    window.addEventListener('sleep-refreshed', onRefresh)
    window.addEventListener('rota-saved', onRefresh)
    window.addEventListener('rota-cleared', onRefresh)

    return () => {
      window.removeEventListener('sleep-refreshed', onRefresh)
      window.removeEventListener('rota-saved', onRefresh)
      window.removeEventListener('rota-cleared', onRefresh)
      cancelScheduledFatigueRiskAlerts()
    }
  }, [requestPermission])

  return null // This component doesn't render anything
}

