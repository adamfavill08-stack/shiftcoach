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
    const rescheduleAll = () => {
      loadAndScheduleEventNotifications()
      void scheduleFatigueRiskAlerts()
    }

    // Request permission and schedule on startup.
    const init = async () => {
      const granted = await requestPermission()
      if (!granted) return
      // Small delay to ensure app is fully loaded.
      setTimeout(rescheduleAll, 1000)
    }

    void init()

    const onRefresh = () => {
      rescheduleAll()
    }
    const onFocus = () => {
      rescheduleAll()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        rescheduleAll()
      }
    }
    window.addEventListener('sleep-refreshed', onRefresh)
    window.addEventListener('rota-saved', onRefresh)
    window.addEventListener('rota-cleared', onRefresh)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('sleep-refreshed', onRefresh)
      window.removeEventListener('rota-saved', onRefresh)
      window.removeEventListener('rota-cleared', onRefresh)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      cancelScheduledFatigueRiskAlerts()
    }
  }, [requestPermission])

  return null // This component doesn't render anything
}

