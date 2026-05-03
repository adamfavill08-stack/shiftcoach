/** Legacy tables use `ts` for sync time, or `created_at`, or both NOT NULL. */
export type ActivityLogSyncInstantColumn = 'ts' | 'created_at'

export function stripActivityLogTimeKeys(p: Record<string, unknown>): Record<string, unknown> {
  const o = { ...p }
  delete o.ts
  delete o.created_at
  return o
}

export function withActivityLogSyncInstant(
  p: Record<string, unknown>,
  iso: string,
  column: ActivityLogSyncInstantColumn,
): Record<string, unknown> {
  const o = stripActivityLogTimeKeys(p)
  o[column] = iso
  return o
}

/** When both columns exist and one is NOT NULL without default, set both to the same instant. */
export function withBothActivityLogSyncInstants(p: Record<string, unknown>, iso: string): Record<string, unknown> {
  const o = stripActivityLogTimeKeys(p)
  o.ts = iso
  o.created_at = iso
  return o
}
