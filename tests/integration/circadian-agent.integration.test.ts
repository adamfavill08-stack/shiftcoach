/**
 * Circadian agent: sleep_logs + profile → runCircadianAgent → realistic scores for night-shift sleep.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMemorySupabase } from '@/tests/helpers/memory-supabase-rota'
import type { MemoryStore } from '@/tests/helpers/memory-supabase-rota'
import { runCircadianAgent } from '@/lib/circadian/circadianAgent'

const USER_ID = 'circadian-agent-e2e-user'

describe('circadian agent integration', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = {
      rota_days: [],
      shifts: [],
      sleep_logs: [],
      profiles: [{ user_id: USER_ID, tz: 'UTC', sleep_goal_h: 7.5 }],
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('night shift sleep 08:00–15:00 for 3 days yields low score, afternoon peak, not adapted', async () => {
    vi.useFakeTimers({ now: new Date(Date.UTC(2026, 3, 5, 12, 0, 0)), toFake: ['Date'] })
    const now = new Date()

    for (let day = 2; day <= 4; day++) {
      const ds = `2026-04-${String(day).padStart(2, '0')}`
      store.sleep_logs!.push({
        user_id: USER_ID,
        type: 'main_sleep',
        start_ts: `${ds}T08:00:00.000Z`,
        end_ts: `${ds}T15:00:00.000Z`,
      })
    }

    const supabase = createMemorySupabase(store)
    const state = await runCircadianAgent({
      supabase,
      userId: USER_ID,
      userShiftState: null,
      reason: 'integration_test',
      now,
    })

    expect(state.score).toBeLessThan(30)
    expect(['Severely disrupted', 'Significantly disrupted']).toContain(state.status)

    const peakHour = parseInt(state.peakAlertnessTime.slice(0, 2), 10)
    expect(peakHour).toBeGreaterThanOrEqual(12)
    expect(state.adaptedPattern).toBe(false)
  })
})
