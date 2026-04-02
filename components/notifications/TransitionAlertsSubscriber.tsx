'use client'

import { useTransitionAlerts } from '@/lib/hooks/useTransitionAlerts'
import { useShiftState } from '@/components/providers/shift-state-provider'

/** Mount once inside ShiftStateProvider; keeps transition push timing in sync with rota / shift agent. */
export function TransitionAlertsSubscriber() {
  const { userShiftState } = useShiftState()
  useTransitionAlerts(userShiftState)
  return null
}
