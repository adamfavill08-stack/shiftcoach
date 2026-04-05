'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyRotaUpdated } from '@/lib/shift-agent/shiftAgent'
import { MobileShell } from '@/components/MobileShell'
import { useTranslation } from '@/components/providers/language-provider'

export default function BulkActions() {
  const { t } = useTranslation()
  const [from, setFrom] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [to, setTo] = useState<string>(() => new Date(Date.now()+7*86400000).toISOString().slice(0,10))
  const [status, setStatus] = useState<'ANNUAL_LEAVE'|'SICK'>('ANNUAL_LEAVE')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function apply() {
    setSaving(true); setMsg(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMsg(t('rota.bulk.notSignedIn')); setSaving(false); return }

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
    else {
      const statusLabel =
        status === 'ANNUAL_LEAVE' ? t('rota.bulk.annualLeave') : t('rota.bulk.sick')
      setMsg(t('rota.bulk.applied', { count: rows.length, status: statusLabel }))
      notifyRotaUpdated()
    }
    setSaving(false)
  }

  return (
    <MobileShell title={t('rota.bulk.title')}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FieldDate label={t('rota.bulk.from')} v={from} set={setFrom} />
          <FieldDate label={t('rota.bulk.to')} v={to} set={setTo} />
        </div>
        <label className="text-sm text-slate-700">
          {t('rota.bulk.status')}
          <select className="w-full border rounded-xl px-3 py-2 mt-1" value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option value="ANNUAL_LEAVE">{t('rota.bulk.annualLeave')}</option>
            <option value="SICK">{t('rota.bulk.sick')}</option>
          </select>
        </label>
        <button type="button" onClick={apply} disabled={saving}
          className="px-4 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-orange-500 to-purple-600">
          {saving ? t('rota.bulk.applying') : t('rota.bulk.apply')}
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
  const d = new Date(fromISO)
  const end = new Date(toISO)
  while (d <= end) { out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1) }
  return out
}

