'use client'

import { useEffect } from 'react'
import type { UserShiftState } from '@/lib/shift-agent/types'
import { registerTransitionPlanPanelVisible } from '@/lib/notifications/transitionAlertVisibility'

/**
 * Marks that the user is viewing a screen that already shows transition / recovery guidance.
 */
export function useTransitionPlanPanelPresence(userShiftState: UserShiftState | null) {
  useEffect(() => {
    if (!userShiftState) return
    const on =
      userShiftState.currentMode === 'TRANSITIONING' ||
      userShiftState.currentMode === 'RECOVERING'
    if (!on) return
    return registerTransitionPlanPanelVisible()
  }, [
    userShiftState?.currentMode,
    userShiftState?.activeTransition?.nextShiftStart?.getTime() ?? 0,
  ])
}
