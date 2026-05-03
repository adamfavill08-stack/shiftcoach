/** Legacy tables use `created_at` instead of `ts` for the sync instant. */
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
