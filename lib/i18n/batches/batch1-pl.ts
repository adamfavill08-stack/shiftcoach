import { batch1PlA } from './batch1-pl-a'
import { batch1PlB } from './batch1-pl-b'

/** Batch 1 — Polish (falls back to English for keys not listed) */
export const batch1Pl: Record<string, string> = { ...batch1PlA, ...batch1PlB }
