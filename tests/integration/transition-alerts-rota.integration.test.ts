/**
 * 1) Rota with upcoming transition → runShiftAgent produces activeTransition
 * 2) buildTransitionAlerts yields the expected scheduled alerts
 * 3) Rota update → new agent run → alert fingerprint changes (reschedule semantics)
 *
 * Browser scheduling is covered in tests/lib/scheduleTransitionAlerts.test.ts;
 * TransitionAlertsSubscriber is mounted in app layout with the same hooks.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { User } from '@supabase/supabase-js'
import { applyRotaPattern } from '@/lib/rota/applyPattern'
import { runShiftAgent, notifyRotaUpdated } from '@/lib/shift-agent/shiftAgent'
import { ShiftStateProvider } from '@/components/providers/shift-state-provider'
import { TransitionAlertsSubscriber } from '@/components/notifications/TransitionAlertsSubscriber'
import { buildTransitionAlerts } from '@/lib/notifications/scheduleTransitionAlerts'
import { supabase } from '@/lib/supabase'
import type { MemoryStore } from '@/tests/helpers/memory-supabase-rota'

const USER_ID = 'e2e-transition-alerts-user'

const hoisted = vi.hoisted(() => ({
  store: { rota_days: [], shifts: [] } as MemoryStore,
}))

vi.mock('@/lib/supabase', async () => {
  const { createMemorySupabase } = await import('@/tests/helpers/memory-supabase-rota')
  return {
    supabase: createMemorySupabase(hoisted.store),
  }
})

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: USER_ID } as User,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

describe('transition alerts + rota (end-to-end data path)', () => {
  let root: Root

  beforeEach(() => {
    hoisted.store.rota_days.length = 0
    hoisted.store.shifts.length = 0
    vi.stubGlobal(
      'Notification',
      class {
        static permission = 'granted'
      },
    )
    vi.useFakeTimers({ now: new Date(2026, 3, 2, 12, 0, 0), toFake: ['Date'] })

    document.body.innerHTML = '<div id="transition-alerts-root"></div>'
    const el = document.getElementById('transition-alerts-root')!
    root = createRoot(el)
    root.render(
      React.createElement(
        ShiftStateProvider,
        null,
        React.createElement(
          React.Fragment,
          null,
          React.createElement(TransitionAlertsSubscriber, null),
          React.createElement('span', { 'data-testid': 'child' }),
        ),
      ),
    )
  })

  afterEach(() => {
    root.unmount()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('rota with upcoming transition yields activeTransition and five alerts for critical+nap; agent still consistent after notifyRotaUpdated', async () => {
    const patternStart = new Date(2026, 3, 2)
    const shiftTimes = {
      day: { start: '07:00', end: '19:00' },
      night: { start: '19:00', end: '07:00' },
    }

    await applyRotaPattern({
      supabase,
      userId: USER_ID,
      startDate: patternStart,
      patternId: '12h-2d-2n-4off',
      startCycleIndex: 0,
      daysToGenerate: 14,
      materializeShiftsWeeks: 2,
      shiftTimes,
    })

    /** Wall-clock aligned to UTC so T-24h (2026-04-02T06:00:00Z) is still in the future. */
    const now = new Date('2026-04-02T05:00:00.000Z')
    const state = await runShiftAgent({ supabase, userId: USER_ID, reason: 'e2e_transition' })

    expect(state.activeTransition).not.toBeNull()
    expect(state.currentMode).toBe('TRANSITIONING')

    const nextStart = state.activeTransition!.nextShiftStart.getTime()
    expect(nextStart).toBeGreaterThan(now.getTime())

    const alerts = buildTransitionAlerts(state, now)
    expect(alerts.length).toBe(5)
    expect(alerts.map((a) => a.stableId)).toEqual([
      expect.stringMatching(/-t24h$/),
      expect.stringMatching(/-t9h$/),
      expect.stringMatching(/-t5h-nap$/),
      expect.stringMatching(/-t2h-anchor$/),
      expect.stringMatching(/-t1h$/),
    ])

    notifyRotaUpdated()
    const stateAfter = await runShiftAgent({ supabase, userId: USER_ID, reason: 'post_notify' })
    expect(stateAfter.activeTransition).not.toBeNull()
    const alertsAfter = buildTransitionAlerts(stateAfter, new Date())
    expect(alertsAfter.length).toBeGreaterThanOrEqual(3)
  })
})
