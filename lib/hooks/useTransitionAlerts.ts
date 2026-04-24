'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { UserShiftState } from '@/lib/shift-agent/types'
import { requestNotificationPermission } from '@/lib/notifications/eventNotifications'
import {
  cancelScheduledTransitionAlerts,
  scheduleTransitionAlerts,
} from '@/lib/notifications/scheduleTransitionAlerts'

function transitionScheduleKey(s: UserShiftState | null): string {
  if (!s?.activeTransition) return 'none'
  const t = s.activeTransition
  return [
    t.nextShiftStart.getTime(),
    String(t.severity),
    t.napRecommended ? '1' : '0',
    s.mealWindows.anchorMeal.getTime(),
    s.sleepWindows.napWindow?.start.getTime() ?? 0,
    s.sleepWindows.napWindow?.end.getTime() ?? 0,
  ].join('|')
}

/**
 * Subscribes to `userShiftState` and schedules/cancels transition alerts when transitions or rota data change.
 */
export function useTransitionAlerts(userShiftState: UserShiftState | null) {
  const stateRef = useRef(userShiftState)

  // Single dependency: matches `transitionScheduleKey(userShiftState)` and satisfies
  // react-hooks/use-memo + react-hooks/preserve-manual-memoization (no non-simple entries).
  const scheduleKey = useMemo(
    () => transitionScheduleKey(userShiftState),
    [userShiftState],
  )

  useEffect(() => {
    void requestNotificationPermission()
  }, [])

  useEffect(() => {
    stateRef.current = userShiftState
  }, [userShiftState])

  useEffect(() => {
    scheduleTransitionAlerts(stateRef.current)
    return () => {
      cancelScheduledTransitionAlerts()
    }
  }, [scheduleKey])
}
