import { batch1PtBrA } from './batch1-pt-br-a'
import { batch1PtBrB } from './batch1-pt-br-b'

/** Batch 1 — Portuguese (Brazil) (falls back to English for keys not listed) */
export const batch1PtBR: Record<string, string> = { ...batch1PtBrA, ...batch1PtBrB }
