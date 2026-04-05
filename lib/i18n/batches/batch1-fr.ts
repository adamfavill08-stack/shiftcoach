import { batch1FrA } from './batch1-fr-a'
import { batch1FrB } from './batch1-fr-b'

/** Batch 1 — French (falls back to English for keys not listed) */
export const batch1Fr: Record<string, string> = { ...batch1FrA, ...batch1FrB }
