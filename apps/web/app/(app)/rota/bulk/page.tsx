'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MobileShell } from '@/components/MobileShell'

export default function BulkActions() {
  const [from, setFrom] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [to, setTo] = useState<string>(() => new Date(Date.now()+7*86400000).toISOString().slice(0,10))
  const [status, setStatus] = useState<'ANNUAL_LEAVE'|'SICK'>('ANNUAL_LEAVE')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function apply() {
    setSaving(true); setMsg(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMsg('Not signed in'); setSaving(false); return }

    const dates = enumerate(from, to)
    const rows = dates.map(iso => ({
      user_id: user.id,
      date: iso,
      label: 'OFF' as const,
      status,
      start_ts: null,
      end_ts: null,
      segments: null,
      notes: null
    }))
    const { error } = await supabase.from('shifts').upsert(rows, { onConflict: 'user_id,date' })
    if (error) setMsg(error.message)
    else setMsg(`Applied ${rows.length} days as ${status.replace('_',' ')}`)
    setSaving(false)
  }

  return (
    <MobileShell title="Bulk Actions">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FieldDate label="From" v={from} set={setFrom} />
          <FieldDate label="To" v={to} set={setTo} />
        </div>
        <label className="text-sm text-slate-700">
          Status
          <select className="w-full border rounded-xl px-3 py-2 mt-1" value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option value="ANNUAL_LEAVE">Annual Leave</option>
            <option value="SICK">Sick</option>
          </select>
        </label>
        <button onClick={apply} disabled={saving}
          className="px-4 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-orange-500 to-purple-600">
          {saving ? 'Applying…' : 'Apply to range'}
        </button>
        {msg && <div className="text-sm text-slate-600">{msg}</div>}
      </div>
    </MobileShell>
  )
}

function FieldDate({ label, v, set }:{ label:string; v:string; set:(s:string)=>void }) {
  return (
    <label className="text-sm text-slate-700">
      {label}
      <input type="date" className="w-full border rounded-xl px-3 py-2 mt-1"
        value={v} onChange={e=>set(e.target.value)} />
    </label>
  )
}

function enumerate(fromISO: string, toISO: string) {
  const out:string[] = []
  let d = new Date(fromISO)
  const end = new Date(toISO)
  while (d <= end) { out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1) }
  return out
}

