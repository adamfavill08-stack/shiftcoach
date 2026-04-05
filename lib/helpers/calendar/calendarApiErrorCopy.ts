/**
 * Turn raw PostgREST / Supabase errors into actionable copy for calendar UIs.
 */
export function explainCalendarApiError(
  message: string,
  t: (key: string) => string,
): { summary: string; steps: string } {
  const m = message.toLowerCase()

  const missingTable =
    m.includes('could not find') ||
    m.includes('does not exist') ||
    m.includes('schema cache')

  if (missingTable && (m.includes('events') || m.includes('event_types') || m.includes('tasks'))) {
    return {
      summary: t('calendar.error.missingDbSummary'),
      steps: t('calendar.error.missingDbSteps'),
    }
  }

  return {
    summary: message,
    steps: t('calendar.error.retrySteps'),
  }
}
