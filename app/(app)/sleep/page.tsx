'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/profile'
import { getMyProfile } from '@/lib/profile'

 type Row = { id:string; date:string; start_ts:string; end_ts:string; sleep_hours:number|null; quality:number; naps:number; notes:string|null }

export default function SleepPage(){
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => { (async () => { setProfile(await getMyProfile()) ; await load() })() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('id,date,start_ts,end_ts,sleep_hours,quality,naps,notes')
      .eq('user_id', user.id)
      .order('start_ts', { ascending: false })
      .limit(30)
    if (error) {
      console.error('[sleep] load error:', error)
      setMsg(error.message)
    } else {
      setRows(data as any)
    }
  }

  // --- Simple inline logger (can be swapped for QuickSleep)
  const [mode, setMode] = useState<'main'|'nap'>('main')
  const [start, setStart] = useState<string>('')
  const [end, setEnd] = useState<string>('')
  const [quality, setQuality] = useState<number>(4)

  const durationHrs = useMemo(() => {
    if (!start || !end) return 0
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    const mins = Math.max(0, Math.round((e - s) / 60000))
    return Math.max(0, mins) / 60
  }, [start, end])

  async function saveSleep() {
    try {
      setMsg(null)
      if (!start || !end) { 
        setMsg('Select start and end times.'); 
        return 
      }

      // Convert to ISO strings for API
      const startTime = new Date(start).toISOString()
      const endTime = new Date(end).toISOString()

      // Map type to naps: main sleep = 0, nap = 1
      const naps = mode === 'nap' ? 1 : 0

      // Call API endpoint
      const res = await fetch('/api/sleep/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime,
          endTime,
          quality,
          naps,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMsg(data.message || data.error || 'Could not log sleep right now, please try again.')
        return
      }

      // Success - reset form and reload
      setStart('')
      setEnd('')
      setQuality(4)
      setMode('main')
      await load()
      setMsg('Sleep logged successfully!')
      setTimeout(() => setMsg(null), 3000)
    } catch (e: any) {
      console.error('[/sleep] save error:', e)
      setMsg(e?.message || 'Could not log sleep right now, please try again.')
    }
  }

  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-1">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }}
            aria-label="Back to dashboard"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Sleep & Naps</h1>
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>How your rest drives your plan</p>
          </div>
        </header>

        {/* Log sleep hero */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-4 transition-all duration-200"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Log sleep</p>
            <div className="inline-flex rounded-full p-1 text-xs" style={{ backgroundColor: 'var(--ring-bg)' }}>
              <button
                onClick={()=>setMode('main')}
                className={`px-3 py-1 rounded-full transition-colors ${mode==='main'?'text-slate-900':'text-slate-600'}`}
                style={{
                  backgroundColor: mode==='main' ? 'var(--card)' : 'transparent',
                  color: mode==='main' ? 'var(--text-main)' : 'var(--text-soft)',
                }}
              >
                Sleep
              </button>
              <button
                onClick={()=>setMode('nap')}
                className={`px-3 py-1 rounded-full transition-colors ${mode==='nap'?'text-slate-900':'text-slate-600'}`}
                style={{
                  backgroundColor: mode==='nap' ? 'var(--card)' : 'transparent',
                  color: mode==='nap' ? 'var(--text-main)' : 'var(--text-soft)',
                }}
              >
                Nap
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-soft)' }}>
              <span>Start</span>
              <input
                type="datetime-local"
                value={start}
                onChange={e=>setStart(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-soft)' }}>
              <span>End</span>
              <input
                type="datetime-local"
                value={end}
                onChange={e=>setEnd(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-soft)' }}>
              <span>Quality</span>
              <input
                type="range"
                min={1}
                max={5}
                value={quality}
                onChange={e=>setQuality(Number(e.target.value))}
                className="w-40 accent-violet-500"
                style={{ backgroundColor: 'var(--ring-bg)' }}
              />
              <span className="font-medium" style={{ color: 'var(--text-main)' }}>{quality}/5</span>
            </label>
            <div className="text-xs" style={{ color: 'var(--text-soft)' }}>{durationHrs>0 ? `${durationHrs.toFixed(1)} h` : ''}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveSleep} className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white">Save sleep</button>
          </div>
          {msg && <p className="text-xs text-rose-600">{msg}</p>}
        </section>

        {/* Recent list */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3 cursor-pointer transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
          onClick={() => router.push('/sleep/history')}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Recent sleep & naps</p>
            <div className="flex items-center gap-2">
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Last 30 entries</p>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
            </div>
          </div>
          <div className="space-y-2">
            {rows.length === 0 ? (
              <div className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No sleep logged yet. Log your first sleep above!
              </div>
            ) : (
              rows.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm" style={{ color: 'var(--text-main)' }}>
                  <div className="flex items-center gap-2">
                    <span>{r.naps === 0 ? '🌙' : '😴'}</span>
                    <span className="capitalize">{r.naps === 0 ? 'Sleep' : 'Nap'}</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-soft)' }}>
                    {new Date(r.start_ts).toLocaleString([], { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short' })}
                    {' – '}
                    {new Date(r.end_ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                    {' · '}{r.sleep_hours ? r.sleep_hours.toFixed(1) : ((new Date(r.end_ts).getTime() - new Date(r.start_ts).getTime()) / 3600000).toFixed(1)} h
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Explainers */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🧠</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>How ShiftCali uses your sleep</p>
          </div>
          <ul className="text-sm list-disc list-inside space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>We adjust your calorie target based on how rested you are.</li>
            <li>We nudge meal timing so heavy meals avoid your biological night.</li>
            <li>Poor sleep may reduce suggested late-night calories and emphasise lighter, protein-forward options.</li>
          </ul>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌙☀️</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Sleep, timing & what to eat</p>
          </div>
          <ul className="text-sm list-disc list-inside space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>When you hit your sleep target at night, calories can sit closer to your base target.</li>
            <li>On short sleep, aim for filling protein + fibre; go lighter late at night.</li>
            <li>On night shifts, prioritise more energy pre‑shift and early‑shift, and keep deep‑night snacks lighter.</li>
          </ul>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>This is general guidance, not medical advice.</p>
        </section>
      </div>
    </main>
  )
}
