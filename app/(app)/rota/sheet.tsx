'use client'

import { useEffect, useState } from 'react'
import { upsertShift, type Shift } from '@/lib/shifts'
import { supabase } from '@/lib/supabase'

type Props = {
  dateISO: string
  initial?: Shift
  onClose: () => void
}

const fmt = (d: Date, opt: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opt }).format(d)

export function ShiftSheet({ dateISO, initial, onClose }: Props) {
  // base fields
  const [label, setLabel] = useState<Shift['label']>(initial?.label ?? 'OFF')
  const [status, setStatus] = useState<Shift['status']>(initial?.status ?? 'PLANNED')
  const [seg1Start, setSeg1Start] = useState<string>(initial?.start_ts ? toLocalTime(initial.start_ts) : '06:30')
  const [seg1End, setSeg1End] = useState<string>(initial?.end_ts ? toLocalTime(initial.end_ts) : '18:30')
  const [seg2On, setSeg2On] = useState<boolean>(!!(initial?.segments && initial.segments.length>0))
  const [seg2Start, setSeg2Start] = useState<string>(initial?.segments?.[0]?.start ? toLocalTime(initial.segments[0].start) : '14:00')
  const [seg2End, setSeg2End] = useState<string>(initial?.segments?.[0]?.end ? toLocalTime(initial.segments[0].end) : '18:00')
  const [overtime, setOvertime] = useState<boolean>(initial?.status === 'OVERTIME')
  const [notes, setNotes] = useState<string>(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (overtime) setStatus('OVERTIME')
    else if (status === 'OVERTIME') setStatus('PLANNED')
  }, [overtime])

  function toTS(isoDate: string, hhmm: string) {
    const [hh, mm] = hhmm.split(':').map(Number)
    const d = new Date(isoDate + 'T00:00:00')
    d.setHours(hh, mm, 0, 0)
    return d.toISOString()
  }

  async function save() {
    setSaving(true); setErr(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErr('Not signed in'); setSaving(false); return }

    // OFF/AL/SICK have no start/end
    const isOffLike = label === 'OFF' || status === 'ANNUAL_LEAVE' || status === 'SICK'
    const start_ts = isOffLike ? null : toTS(dateISO, seg1Start)
    // If NIGHT and end before start, roll to next day automatically
    let endA = isOffLike ? null : toTS(dateISO, seg1End)
    if (!isOffLike && start_ts && endA && new Date(endA) <= new Date(start_ts)) {
      const d = new Date(endA); d.setDate(d.getDate()+1); endA = d.toISOString()
    }

    const segments = seg2On && !isOffLike
      ? [{
          start: toTS(dateISO, seg2Start),
          end:   (() => {
            const e = toTS(dateISO, seg2End); 
            let ed = new Date(e)
            if (new Date(e) <= new Date(toTS(dateISO, seg2Start))) ed.setDate(ed.getDate()+1)
            return ed.toISOString()
          })()
        }]
      : null

    try {
      await upsertShift({
        user_id: user.id,
        date: dateISO,
        label,
        status,
        start_ts,
        end_ts: endA,
        segments,
        notes
      })
      onClose()
    } catch (e:any) {
      setErr(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const totalHrs = (() => {
    if (label === 'OFF' || status === 'ANNUAL_LEAVE' || status === 'SICK') return 0
    const a = spanHours(seg1Start, seg1End)
    const b = seg2On ? spanHours(seg2Start, seg2End) : 0
    return a + b
  })()

  return (
    <div className="fixed inset-0 z-30 bg-black/30 flex items-end">
      <div className="w-full max-w-[430px] mx-auto rounded-t-2xl bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-900">
            {fmt(new Date(dateISO), { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <button onClick={onClose} className="px-3 py-1.5 border rounded-xl">Close</button>
        </div>

        {/* Status chips */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {(['PLANNED','SICK','ANNUAL_LEAVE','OVERTIME'] as const).map(s => (
            <button key={s}
              onClick={()=>{ setStatus(s); setOvertime(s==='OVERTIME') }}
              className={`px-3 py-1.5 rounded-full border text-sm ${status===s ? 'bg-slate-900 text-white' : 'bg-white'}`}>
              {s.replace('_',' ')}
            </button>
          ))}
        </div>

        {/* Label chips */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {(['DAY','NIGHT','OFF','CUSTOM'] as const).map(l => (
            <button key={l} onClick={()=>setLabel(l)}
              className={`px-3 py-1.5 rounded-full border text-sm ${label===l ? 'bg-slate-900 text-white' : 'bg-white'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Segments */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <TimeField label="Segment 1 start" v={seg1Start} set={setSeg1Start} disabled={label==='OFF' || status==='ANNUAL_LEAVE' || status==='SICK'} />
          <TimeField label="Segment 1 end"   v={seg1End}   set={setSeg1End}   disabled={label==='OFF' || status==='ANNUAL_LEAVE' || status==='SICK'} />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <input id="seg2" type="checkbox" checked={seg2On} onChange={e=>setSeg2On(e.target.checked)}
            disabled={label==='OFF' || status==='ANNUAL_LEAVE' || status==='SICK'} />
          <label htmlFor="seg2" className="text-sm text-slate-700">Add second segment</label>
        </div>

        {seg2On && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <TimeField label="Segment 2 start" v={seg2Start} set={setSeg2Start} />
            <TimeField label="Segment 2 end"   v={seg2End}   set={setSeg2End} />
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <input id="ot" type="checkbox" checked={overtime} onChange={e=>setOvertime(e.target.checked)} />
          <label htmlFor="ot" className="text-sm text-slate-700">Overtime worked today</label>
        </div>

        <div className="mt-3 text-sm text-slate-600">Total hours: <span className="font-semibold text-slate-900">{totalHrs.toFixed(1)}</span></div>

        <textarea
          className="mt-3 w-full border rounded-xl p-2 text-sm"
          placeholder="Notes"
          value={notes} onChange={e=>setNotes(e.target.value)}
          rows={3}
        />

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

        <button onClick={save} disabled={saving}
          className="mt-4 w-full rounded-xl py-3 font-semibold text-white bg-gradient-to-r from-orange-500 to-purple-600">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function TimeField({ label, v, set, disabled }:{ label:string; v:string; set:(s:string)=>void; disabled?:boolean }) {
  return (
    <label className="text-sm text-slate-700">
      <div className="mb-1">{label}</div>
      <input type="time" value={v} onChange={e=>set(e.target.value)} disabled={disabled}
        className="w-full border rounded-xl px-3 py-2" />
    </label>
  )
}

function toLocalTime(iso: string) {
  const d = new Date(iso); const hh = String(d.getHours()).padStart(2,'0'); const mm = String(d.getMinutes()).padStart(2,'0'); return `${hh}:${mm}`
}

function spanHours(a: string, b: string) {
  const [ah,am] = a.split(':').map(Number)
  const [bh,bm] = b.split(':').map(Number)
  let s = ah*60+am, e = bh*60+bm
  if (e <= s) e += 24*60 // crosses midnight
  return (e - s) / 60
}

