import { describe, expect, it } from 'vitest'
import { resolvePostSignInRoute } from '@/app/auth/sign-in/page'

describe('resolvePostSignInRoute', () => {
  it('routes to dashboard when onboarding_completed is true even if legacy profile fields are absent', () => {
    const route = resolvePostSignInRoute({
      onboarding_completed: true,
      // legacy completeness fields intentionally absent/null in this shape
      // @ts-expect-error test regression guard for old logic
      height_cm: null,
      // @ts-expect-error test regression guard for old logic
      weight_kg: null,
    })
    expect(route).toBe('/dashboard')
  })

  it('routes to onboarding when onboarding is incomplete', () => {
    expect(resolvePostSignInRoute({ onboarding_completed: false })).toBe('/onboarding')
    expect(resolvePostSignInRoute({ onboarding_completed: null })).toBe('/onboarding')
    expect(resolvePostSignInRoute(null)).toBe('/onboarding')
  })
})
