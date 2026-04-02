/**
 * End-to-end style chain: applyRotaPattern → shifts rows → notifyRotaUpdated →
 * ShiftStateProvider listener → runShiftAgent (with console log of UserShiftState).
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { User } from '@supabase/supabase-js'
import { applyRotaPattern } from '@/lib/rota/applyPattern'
import * as shiftAgentMod from '@/lib/shift-agent/shiftAgent'
import type { RunShiftAgentOptions } from '@/lib/shift-agent/shiftAgent'
import { notifyRotaUpdated } from '@/lib/shift-agent/shiftAgent'
import type { UserShiftState } from '@/lib/shift-agent/types'
import { ShiftStateProvider } from '@/components/providers/shift-state-provider'
import { supabase } from '@/lib/supabase'
import { isoLocalDate } from '@/lib/shifts'
import type { MemoryStore } from '@/tests/helpers/memory-supabase-rota'

const USER_ID = 'e2e-rota-chain-user'

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

function summarizeShiftState(s: UserShiftState) {
  return {
    currentMode: s.currentMode,
    patternType: s.patternType,
    lastCalculated: s.lastCalculated.toISOString(),
    activeTransition: s.activeTransition
      ? {
          severity: s.activeTransition.severity,
          nextShiftStart: s.activeTransition.nextShiftStart.toISOString(),
        }
      : null,
    mealWindows: {
      meal1: s.mealWindows.meal1.toISOString(),
      meal2: s.mealWindows.meal2.toISOString(),
      anchorMeal: s.mealWindows.anchorMeal.toISOString(),
      shiftSnack1: s.mealWindows.shiftSnack1.toISOString(),
    },
    sleepWindows: {
      primarySleep: {
        start: s.sleepWindows.primarySleep.start.toISOString(),
        end: s.sleepWindows.primarySleep.end.toISOString(),
      },
      napWindow: s.sleepWindows.napWindow
        ? {
            start: s.sleepWindows.napWindow.start.toISOString(),
            end: s.sleepWindows.napWindow.end.toISOString(),
          }
        : null,
    },
  }
}

describe('rota → shifts → notifyRotaUpdated → runShiftAgent chain', () => {
  let root: Root
  let runShiftAgentSpy: MockInstance<(opts: RunShiftAgentOptions) => Promise<UserShiftState>>

  beforeEach(() => {
    hoisted.store.rota_days.length = 0
    hoisted.store.shifts.length = 0

    vi.useFakeTimers({ now: new Date(2026, 3, 2, 12, 0, 0), toFake: ['Date'] })

    // Delegates to the real implementation while recording calls / async results.
    runShiftAgentSpy = vi.spyOn(shiftAgentMod, 'runShiftAgent')

    document.body.innerHTML = '<div id="integration-root"></div>'
    const el = document.getElementById('integration-root')!
    root = createRoot(el)
    root.render(
      React.createElement(ShiftStateProvider, null, React.createElement('span', { 'data-testid': 'child' })),
    )
  })

  afterEach(() => {
    root.unmount()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('materializes shifts with an upcoming day→night transition and reruns the agent on notifyRotaUpdated', async () => {
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

    const { shifts } = hoisted.store
    expect(shifts.length).toBeGreaterThan(0)

    const byDate = new Map(shifts.map((r) => [r.date, r]))
    expect(byDate.get('2026-04-02')?.label).toBe('DAY')
    expect(byDate.get('2026-04-03')?.label).toBe('DAY')
    expect(byDate.get('2026-04-04')?.label).toBe('NIGHT')

    const now = new Date()
    expect(isoLocalDate(now)).toBe('2026-04-02')
    const in72h = new Date(now.getTime() + 72 * 3600000)
    const nightStart = byDate.get('2026-04-04')!.start_ts!
    expect(new Date(nightStart).getTime()).toBeLessThanOrEqual(in72h.getTime())

    await vi.waitUntil(() => runShiftAgentSpy.mock.calls.some((c) => c[0]?.reason === 'app_load'))

    notifyRotaUpdated()

    await vi.waitUntil(() =>
      runShiftAgentSpy.mock.calls.some((c) => c[0]?.reason === 'rota_updated_event'),
    )

    const eventIdx = runShiftAgentSpy.mock.calls.findIndex((c) => c[0]?.reason === 'rota_updated_event')
    expect(eventIdx).toBeGreaterThanOrEqual(0)

    const settled = runShiftAgentSpy.mock.results[eventIdx]!
    const last = (await Promise.resolve((settled as { value: unknown }).value)) as UserShiftState
    const summary = summarizeShiftState(last)

    expect(last.patternType).toBeDefined()
    expect(last.currentMode).toBeDefined()

    console.log('[e2e rota chain] shift rows (sample):', shifts.slice(0, 6))
    console.log(
      '[e2e rota chain] userShiftState after rota_updated_event:',
      JSON.stringify(summary, null, 2),
    )
  })
})
