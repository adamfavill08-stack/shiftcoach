import { describe, expect, it } from 'vitest'
import { resolvePostSignInRoute } from '@/app/auth/sign-in/page'

describe('resolvePostSignInRoute', () => {
  it('routes to dashboard when onboarding_completed is true even if legacy profile fields are absent', () => {
    const route = resolvePostSignInRoute({
      onboarding_completed: true,
      height_cm: null,
      weight_kg: null,
    } as { onboarding_completed?: boolean | null })
    expect(route).toBe('/dashboard')
  })

  it('routes to onboarding when onboarding is incomplete', () => {
    expect(resolvePostSignInRoute({ onboarding_completed: false })).toBe('/onboarding')
    expect(resolvePostSignInRoute({ onboarding_completed: null })).toBe('/onboarding')
    expect(resolvePostSignInRoute(null)).toBe('/onboarding')
  })
})
