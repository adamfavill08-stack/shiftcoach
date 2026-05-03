export type ManualHistoryStatusKind = 'counted' | 'replaced' | 'not_counted'

/**
 * Maps DB merge_status to UI status. Legacy rows without merge_status count as active
 * unless `wearableWinsDay` (wearable is source of truth for that civil day).
 */
export function manualEntryStatusKind(
  mergeStatus: string | null | undefined,
  ctx?: { wearableWinsDay?: boolean },
): ManualHistoryStatusKind {
  if (mergeStatus === 'superseded_by_wearable') return 'replaced'
  if (ctx?.wearableWinsDay) return 'not_counted'
  if (mergeStatus == null || mergeStatus === 'active') return 'counted'
  return 'not_counted'
}

export function manualHistoryRowMuted(
  mergeStatus: string | null | undefined,
  ctx?: { wearableWinsDay?: boolean },
): boolean {
  return manualHistoryRowSemantics(mergeStatus, ctx).muted
}

/** DOM / test hooks: superseded rows are muted and tagged `replaced`. */
export function manualHistoryRowSemantics(
  mergeStatus: string | null | undefined,
  ctx?: { wearableWinsDay?: boolean },
): {
  statusKind: ManualHistoryStatusKind
  muted: boolean
} {
  const statusKind = manualEntryStatusKind(mergeStatus, ctx)
  const muted =
    statusKind === 'replaced' || (Boolean(ctx?.wearableWinsDay) && statusKind === 'not_counted')
  return { statusKind, muted }
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
