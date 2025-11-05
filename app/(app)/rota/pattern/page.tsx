'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MobileShell } from '@/components/MobileShell'
import { buildPattern } from '@/lib/patterns'

export default function PatternWizard() {
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [weeks, setWeeks] = useState(8)
  const [startLabel, setStartLabel] = useState<'DAY'|'NIGHT'>('DAY')
  const [dayStart, setDayStart] = useState('06:30')
  const [dayEnd, setDayEnd] = useState('18:30')
  const [nightStart, setNightStart] = useState('18:30')
  const [nightEnd, setNightEnd] = useState('06:30')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  function makePreview() {
    const plan = buildPattern({
      kind: '4on4off',
      startDate: new Date(startDate),
      startLabel, dayStart, dayEnd, nightStart, nightEnd, weeks
    })
    setPreview(plan.slice(0, 14)) // first 2 weeks preview
  }

  async function apply() {
    setSaving(true); setMsg(null)
    const plan = buildPattern({
      kind: '4on4off',
      startDate: new Date(startDate),
      startLabel, dayStart, dayEnd, nightStart, nightEnd, weeks
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMsg('Not signed in'); setSaving(false); return }

    const rows = plan.map(p => ({
      user_id: user.id,
      date: p.date,
      label: p.label,
      status: 'PLANNED' as const,
      start_ts: p.start,
      end_ts: p.end,
      segments: null,
      notes: null
    }))

    const { error } = await supabase.from('shifts').upsert(rows, { onConflict: 'user_id,date' })
    if (error) setMsg(error.message)
    else setMsg(`Applied ${rows.length} days`)
    setSaving(false)
  }

  return (
    <MobileShell title="Pattern Wizard">
      <div className="space-y-3">
        <div>
          <div className="text-sm text-slate-700 mb-1">Start date</div>
          <input type="date" className="w-full border rounded-xl px-3 py-2"
            value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            Weeks
            <input type="number" min={1} max={52} className="w-full border rounded-xl px-3 py-2 mt-1"
              value={weeks} onChange={e=>setWeeks(parseInt(e.target.value||'8'))} />
          </label>
          <label className="text-sm text-slate-700">
            Start block
            <select className="w-full border rounded-xl px-3 py-2 mt-1" value={startLabel}
              onChange={e=>setStartLabel(e.target.value as any)}>
              <option value="DAY">DAY first</option>
              <option value="NIGHT">NIGHT first</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Day start" v={dayStart} set={setDayStart} />
          <Field label="Day end"   v={dayEnd}   set={setDayEnd} />
          <Field label="Night start" v={nightStart} set={setNightStart} />
          <Field label="Night end"   v={nightEnd}   set={setNightEnd} />
        </div>

        <div className="flex gap-2">
          <button onClick={makePreview} className="px-4 py-2 rounded-xl border">Preview</button>
          <button onClick={apply} disabled={saving}
            className="px-4 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-orange-500 to-purple-600">
            {saving ? 'Applying…' : 'Apply to calendar'}
          </button>
        </div>

        {msg && <div className="text-sm text-slate-600">{msg}</div>}

        {preview && (
          <div className="mt-2 rounded-2xl border p-3">
            <div className="text-sm font-semibold mb-2">First 14 days</div>
            <ul className="text-sm space-y-1">
              {preview.map((p,i)=>(
                <li key={i}>
                  <span className="text-slate-500 mr-2">{p.date}</span>
                  <span className="font-medium">{p.label}</span>
                  {p.start && <> • {fmt(p.start)}–{fmt(p.end)}</>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </MobileShell>
  )
}

function Field({ label, v, set }:{ label:string; v:string; set:(s:string)=>void }) {
  return (
    <label className="text-sm text-slate-700">
      {label}
      <input type="time" className="w-full border rounded-xl px-3 py-2 mt-1"
        value={v} onChange={e=>set(e.target.value)} />
    </label>
  )
}

function fmt(iso:string){ const d=new Date(iso); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }

