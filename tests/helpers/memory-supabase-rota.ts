/**
 * Minimal in-memory Supabase client for rota + shift-agent + circadian integration tests.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type MemorySleepLog = Record<string, unknown> & { user_id: string }

export type MemoryProfile = {
  user_id: string
  sleep_goal_h?: number | null
  tz?: string | null
}

export type MemoryStore = {
  rota_days: { user_id: string; date: string; shift_type: string }[]
  shifts: {
    user_id: string
    date: string
    label: string
    status: string
    start_ts: string | null
    end_ts: string | null
    notes: string | null
  }[]
  sleep_logs?: MemorySleepLog[]
  profiles?: MemoryProfile[]
}

function ensureArrays(store: MemoryStore) {
  if (!store.sleep_logs) store.sleep_logs = []
  if (!store.profiles) store.profiles = []
}

function matchEq(row: Record<string, unknown>, col: string, val: unknown): boolean {
  return row[col] === val
}

function matchGte(row: Record<string, unknown>, col: string, val: string): boolean {
  const v = row[col]
  if (typeof v !== 'string') return false
  return v >= val
}

function matchLte(row: Record<string, unknown>, col: string, val: string): boolean {
  const v = row[col]
  if (typeof v !== 'string') return false
  return v <= val
}

class SleepLogsSelectBuilder {
  private checks: Array<(r: Record<string, unknown>) => boolean> = []
  private orderCol = 'start_ts'
  private orderAsc = false
  private maxRows = 100

  constructor(
    private store: MemoryStore,
    private cols: string,
  ) {}

  eq(col: string, val: unknown) {
    this.checks.push((r) => matchEq(r, col, val))
    return this
  }

  gte(col: string, val: string) {
    this.orderCol = col
    this.checks.push((r) => {
      const t = (r[col] ?? r.start_ts ?? r.start_at) as string | undefined
      return typeof t === 'string' && t >= val
    })
    return this
  }

  not(col: string, op: string, val: unknown) {
    if (op === 'is' && val === null) {
      this.checks.push((r) => {
        const v = r[col]
        return v != null && v !== ''
      })
    }
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col
    this.orderAsc = opts?.ascending ?? true
    return this
  }

  limit(n: number) {
    this.maxRows = n
    return this
  }

  private filterRows(): Record<string, unknown>[] {
    ensureArrays(this.store)
    const arr = this.store.sleep_logs as Record<string, unknown>[]
    return arr.filter((row) => this.checks.every((c) => c(row)))
  }

  private sortKey(row: Record<string, unknown>): string {
    const o = row[this.orderCol]
    if (o != null && o !== '') return String(o)
    if (this.orderCol === 'end_at') return String(row.end_ts ?? row.end_at ?? '')
    return String((row[this.orderCol] ?? row.start_ts ?? row.start_at) ?? '')
  }

  private pickRows(): Record<string, unknown>[] {
    let rows = this.filterRows()
    rows = [...rows].sort((a, b) => {
      const ka = this.sortKey(a)
      const kb = this.sortKey(b)
      return this.orderAsc ? ka.localeCompare(kb) : kb.localeCompare(ka)
    })
    return rows.slice(0, this.maxRows)
  }

  maybeSingle(): Promise<{ data: unknown; error: null }> {
    const rows = this.pickRows()
    const row = rows[0] ?? null
    if (!row) return Promise.resolve({ data: null, error: null })
    const picks = this.cols.split(',').map((c) => c.trim())
    const o: Record<string, unknown> = {}
    for (const k of picks) {
      if (k in row) o[k] = row[k]
    }
    return Promise.resolve({ data: o, error: null })
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const rows = this.pickRows()
    const picks = this.cols.split(',').map((c) => c.trim())
    const data = rows.map((r) => {
      const o: Record<string, unknown> = {}
      for (const k of picks) {
        if (k in r) o[k] = r[k]
      }
      return o
    })
    return Promise.resolve({ data, error: null } as { data: unknown; error: null }).then(
      onfulfilled as any,
      onrejected as any,
    )
  }
}

export function createMemorySupabase(store: MemoryStore): SupabaseClient {
  class DeleteBuilder {
    private table: keyof MemoryStore
    private checks: Array<(r: Record<string, unknown>) => boolean> = []

    constructor(table: keyof MemoryStore) {
      this.table = table
    }

    eq(col: string, val: unknown) {
      this.checks.push((r) => matchEq(r, col, val))
      return this
    }

    gte(col: string, val: string) {
      this.checks.push((r) => matchGte(r, col, val))
      return this
    }

    lte(col: string, val: string) {
      this.checks.push((r) => matchLte(r, col, val))
      return this
    }

    then<TResult1 = { error: null }, TResult2 = never>(
      onfulfilled?: ((value: { error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
      if (this.table !== 'rota_days' && this.table !== 'shifts') {
        return Promise.resolve({ error: null } as { error: null }).then(onfulfilled as any, onrejected as any)
      }
      const arr = store[this.table] as unknown as Record<string, unknown>[]
      const kept = arr.filter((row) => !this.checks.every((c) => c(row)))
      const target = store[this.table] as unknown as Record<string, unknown>[]
      target.length = 0
      target.push(...kept)
      const p = Promise.resolve({ error: null } as { error: null })
      return p.then(onfulfilled as any, onrejected as any)
    }
  }

  class SelectBuilder {
    private table: keyof MemoryStore
    private cols: string
    private checks: Array<(r: Record<string, unknown>) => boolean> = []

    constructor(table: keyof MemoryStore, cols: string) {
      this.table = table
      this.cols = cols
    }

    eq(col: string, val: unknown) {
      this.checks.push((r) => matchEq(r, col, val))
      return this
    }

    gte(col: string, val: string) {
      this.checks.push((r) => matchGte(r, col, val))
      return this
    }

    lte(col: string, val: string) {
      this.checks.push((r) => matchLte(r, col, val))
      return this
    }

    not(_col: string, _op: string, _val: unknown) {
      return this
    }

    order(_col: string, _opts?: { ascending?: boolean }) {
      return this
    }

    limit(_n: number) {
      return this
    }

    maybeSingle(): Promise<{ data: unknown; error: null }> {
      const rows = this.filterRows()
      const row = rows[0] ?? null
      return Promise.resolve({ data: row, error: null })
    }

    private filterRows(): Record<string, unknown>[] {
      const arr = store[this.table] as unknown as Record<string, unknown>[]
      return arr.filter((row) => this.checks.every((c) => c(row)))
    }

    then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
      let rows = this.filterRows()
      if (this.table === 'shifts') {
        rows = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)))
      }
      const picks = this.cols.split(',').map((c) => c.trim())
      const data = rows.map((r) => {
        const o: Record<string, unknown> = {}
        for (const k of picks) {
          if (k in r) o[k] = r[k]
        }
        return o
      })
      return Promise.resolve({ data, error: null } as { data: unknown; error: null }).then(
        onfulfilled as any,
        onrejected as any,
      )
    }
  }

  return {
    from(table: string) {
      const t = table as keyof MemoryStore
      if (t === 'rota_days' || t === 'shifts') {
        return {
          delete: () => new DeleteBuilder(t),
          upsert: (rows: unknown[], _opts?: unknown) => {
            const list = rows as Record<string, unknown>[]
            if (t === 'shifts') {
              for (const row of list) {
                const uid = String(row.user_id)
                const d = String(row.date)
                const idx = store.shifts.findIndex((s) => s.user_id === uid && s.date === d)
                const rec = {
                  user_id: uid,
                  date: d,
                  label: String(row.label ?? 'OFF'),
                  status: String(row.status ?? 'PLANNED'),
                  start_ts: (row.start_ts as string | null) ?? null,
                  end_ts: (row.end_ts as string | null) ?? null,
                  notes: (row.notes as string | null) ?? null,
                }
                if (idx >= 0) store.shifts[idx] = rec
                else store.shifts.push(rec)
              }
            } else if (t === 'rota_days') {
              for (const row of list) {
                const uid = String(row.user_id)
                const d = String(row.date)
                const idx = store.rota_days.findIndex((s) => s.user_id === uid && s.date === d)
                const rec = {
                  user_id: uid,
                  date: d,
                  shift_type: String(row.shift_type),
                }
                if (idx >= 0) store.rota_days[idx] = rec
                else store.rota_days.push(rec)
              }
            }
            return Promise.resolve({ error: null })
          },
          select: (cols: string) => new SelectBuilder(t, cols),
        }
      }
      if (table === 'sleep_logs') {
        return {
          select: (cols: string) => new SleepLogsSelectBuilder(store, cols),
        }
      }
      if (table === 'profiles') {
        return {
          update: (_patch: Record<string, unknown>) => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          select: (cols: string) => ({
            eq(col: string, val: unknown) {
              return {
                maybeSingle(): Promise<{ data: unknown; error: null }> {
                  ensureArrays(store)
                  const row = store.profiles!.find((p) => p.user_id === val) ?? null
                  const picks = cols.split(',').map((c) => c.trim())
                  if (!row) return Promise.resolve({ data: null, error: null })
                  const o: Record<string, unknown> = {}
                  for (const k of picks) {
                    if (k in row) o[k] = (row as Record<string, unknown>)[k]
                  }
                  return Promise.resolve({ data: o, error: null })
                },
              }
            },
          }),
        }
      }
      throw new Error(`memory supabase: unmapped table ${table}`)
    },
  } as unknown as SupabaseClient
}
