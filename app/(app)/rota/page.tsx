'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MobileShell } from '@/components/MobileShell'
import { isoLocalDate, weekStart, getShiftsForWeek, type Shift, labelColor } from '@/lib/shifts'
import { ShiftSheet } from './sheet'

type DayCell = { date: Date; iso: string; shift?: Shift }

const fmt = (d: Date, opt: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opt }).format(d)

export default function RotaPage() {
  const router = useRouter()
  const [week0, setWeek0] = useState<Date>(() => weekStart(new Date()))
  const [days, setDays] = useState<DayCell[]>([])
  const [selected, setSelected] = useState<DayCell | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/sign-in'); return }
      await load()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week0])

  async function load() {
    setLoading(true)
    const arr: DayCell[] = []
    const start = new Date(week0)
    for (let i=0;i<7;i++){
      const d = new Date(start); d.setDate(start.getDate()+i)
      arr.push({ date: d, iso: isoLocalDate(d) })
    }
    const shifts = await getShiftsForWeek(week0)
    const map = new Map(shifts.map(s => [s.date, s]))
    setDays(arr.map(dc => ({ ...dc, shift: map.get(dc.iso) })))
    setLoading(false)
  }

  function nextWeek(delta: number) {
    const d = new Date(week0)
    d.setDate(d.getDate() + 7*delta)
    setWeek0(weekStart(d))
  }

  return (
    <MobileShell title="Rota">
      <div className="flex gap-2 mb-3">
        <Link href="/rota/pattern" className="px-3 py-1.5 rounded-lg border">Pattern Wizard</Link>
        <Link href="/rota/bulk" className="px-3 py-1.5 rounded-lg border">Bulk Actions</Link>
      </div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={()=>nextWeek(-1)} className="px-3 py-1.5 rounded-lg border">◀</button>
        <div className="text-slate-900 font-semibold">
          {fmt(week0, { month: 'short', day: 'numeric' })} – {fmt(new Date(week0.getFullYear(), week0.getMonth(), week0.getDate() + 6), { month: 'short', day: 'numeric' })}
        </div>
        <button onClick={()=>nextWeek(1)} className="px-3 py-1.5 rounded-lg border">▶</button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(dc => {
          const lbl = dc.shift?.label ?? 'OFF'
          const st = dc.shift?.status ?? 'PLANNED'
          const color = labelColor(lbl as any, st as any)
          return (
            <button
              key={dc.iso}
              onClick={() => setSelected(dc)}
              className={`aspect-[0.75] rounded-xl border text-xs p-1 flex flex-col items-center justify-center ${color}`}
            >
              <div className="font-semibold">
                {fmt(dc.date, { weekday: 'short' })}
              </div>
              <div>{fmt(dc.date, { day: 'numeric' })}</div>
              <div className="mt-1">
                {dc.shift?.label === 'DAY' && '06:30–18:30'}
                {dc.shift?.label === 'NIGHT' && '18:30–06:30'}
                {!dc.shift && 'Off'}
              </div>
              {dc.shift?.status === 'SICK' && <div className="mt-1">Sick</div>}
              {dc.shift?.status === 'ANNUAL_LEAVE' && <div className="mt-1">Leave</div>}
            </button>
          )
        })}
      </div>

      {selected && (
        <ShiftSheet
          key={selected.iso} // force fresh state when switching days
          dateISO={selected.iso}
          initial={selected.shift}
          onClose={() => { setSelected(null); load() }}
        />
      )}

      {loading && <div className="mt-4 text-sm text-slate-500">Loading week…</div>}
    </MobileShell>
  )
}
