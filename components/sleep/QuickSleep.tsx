'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function dISO(d: Date){ return d.toISOString().slice(0,10) }
function toISO(dateISO: string, hhmm: string) {
  const [h,m] = hhmm.split(':').map(Number)
  const d = new Date(dateISO + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function QuickSleep({ onSaved }:{ onSaved: ()=>void }) {
  const now = new Date()
  const [date, setDate] = useState(dISO(now))
  const [start, setStart] = useState('23:00')
  const [end, setEnd] = useState('07:00')
  const [quality, setQuality] = useState(3)
  const [type, setType] = useState<'main'|'nap'>('main')
  const [msg, setMsg] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function preset(kind: 'lastNight'|'postNight'|'nap20') {
    const today = dISO(new Date())
    if (kind === 'lastNight') {
      setType('main'); setDate(today); setStart('23:00'); setEnd('07:30')
    }
    if (kind === 'postNight') {
      setType('main'); setDate(today); setStart('08:30'); setEnd('14:30')
    }
    if (kind === 'nap20') {
      setType('nap'); setDate(today); setStart('17:00'); setEnd('17:20')
    }
  }

  async function save() {
    setMsg(null)
    const startISO = toISO(date, start)
    let endISO = toISO(date, end)
    if (new Date(endISO) <= new Date(startISO)) {
      const e = new Date(endISO); e.setDate(e.getDate()+1); endISO = e.toISOString()
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMsg('Not signed in'); return }
    const { error } = await supabase.from('sleep_logs').insert({
      user_id: user.id, start_ts: startISO, end_ts: endISO, quality, type
    })
    if (error) setMsg(error.message)
    else { setMsg('Saved'); setOpen(false); onSaved() }
  }

  return (
    <>
      <button
        onClick={()=>setOpen(true)}
        className="btn-primary"
      >
        Log sleep
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Log sleep</div>
              <button onClick={()=>setOpen(false)} className="text-slate-500">✕</button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">Date
                <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
              </label>
              <label className="text-sm">Type
                <select value={type} onChange={e=>setType(e.target.value as any)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <option value="main">Main sleep</option>
                  <option value="nap">Nap</option>
                </select>
              </label>
              <label className="text-sm">Start
                <input type="time" value={start} onChange={e=>setStart(e.target.value)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
              </label>
              <label className="text-sm">End
                <input type="time" value={end} onChange={e=>setEnd(e.target.value)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
              </label>
              <label className="text-sm col-span-2">Quality: {quality}/5
                <input type="range" min={1} max={5} value={quality} onChange={e=>setQuality(Number(e.target.value))}
                  className="w-full mt-1" />
              </label>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={()=>preset('lastNight')} className="px-3 py-1.5 rounded-xl border text-xs">Last night</button>
              <button onClick={()=>preset('postNight')} className="px-3 py-1.5 rounded-xl border text-xs">Post-night</button>
              <button onClick={()=>preset('nap20')} className="px-3 py-1.5 rounded-xl border text-xs">Nap 20m</button>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={save} className="flex-1 btn-primary">Save</button>
              <button onClick={()=>setOpen(false)} className="flex-1 btn-primary">Cancel</button>
            </div>

            {msg && <div className="text-sm text-slate-600 mt-2">{msg}</div>}
          </div>
        </div>
      )}
    </>
  )
}
