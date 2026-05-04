import type { Profile } from '@/lib/profile'

/** Matches settings profile “complete” checks used for first-time setup gating. */
export function isGuidedTourProfileComplete(p: Partial<Profile> | null | undefined): boolean {
  if (!p) return false
  return Boolean(
    String(p.name ?? '').trim() &&
      p.sex &&
      p.goal &&
      typeof p.weight_kg === 'number' &&
      p.weight_kg > 0 &&
      typeof p.height_cm === 'number' &&
      p.height_cm > 0 &&
      (Boolean(p.date_of_birth) || (typeof p.age === 'number' && p.age > 0)),
  )
}
