/**
 * When the user is on a screen that already surfaces transition / flip-day guidance,
 * we avoid duplicate system notifications (paired with document.visibilityState).
 */
let visiblePanelCount = 0

export function registerTransitionPlanPanelVisible(): () => void {
  visiblePanelCount += 1
  return () => {
    visiblePanelCount = Math.max(0, visiblePanelCount - 1)
  }
}

export function isTransitionPlanPanelVisible(): boolean {
  return visiblePanelCount > 0
}
