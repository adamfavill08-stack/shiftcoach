export type ManualHistoryStatusKind = 'counted' | 'replaced' | 'not_counted'

/**
 * Maps DB merge_status to UI status. Legacy rows without merge_status count as active.
 */
export function manualEntryStatusKind(mergeStatus: string | null | undefined): ManualHistoryStatusKind {
  if (mergeStatus === 'superseded_by_wearable') return 'replaced'
  if (mergeStatus == null || mergeStatus === 'active') return 'counted'
  return 'not_counted'
}

export function manualHistoryRowMuted(mergeStatus: string | null | undefined): boolean {
  return manualEntryStatusKind(mergeStatus) === 'replaced'
}

/** DOM / test hooks: superseded rows are muted and tagged `replaced`. */
export function manualHistoryRowSemantics(mergeStatus: string | null | undefined): {
  statusKind: ManualHistoryStatusKind
  muted: boolean
} {
  const statusKind = manualEntryStatusKind(mergeStatus)
  return { statusKind, muted: statusKind === 'replaced' }
}

/** Localized time range for a manual session window (en dash between times). */
export function formatManualTimeWindow(
  startIso: string | null,
  endIso: string | null,
  opts?: { locale?: string; timeZone?: string },
): string {
  const loc = opts?.locale
  const tz = opts?.timeZone
  const fmt = (iso: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit', timeZone: tz })
  }
  const a = fmt(startIso)
  const b = fmt(endIso)
  if (a && b) return `${a}\u2013${b}`
  if (a) return a
  if (b) return b
  return '\u2014'
}
