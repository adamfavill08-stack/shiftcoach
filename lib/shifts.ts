import { supabase } from './supabase'

export type Shift = {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  label: 'DAY'|'NIGHT'|'OFF'|'CUSTOM'|'ONCALL'
  status: 'PLANNED'|'SICK'|'ANNUAL_LEAVE'|'SWAP'|'OVERTIME'
  start_ts: string | null
  end_ts: string | null
  segments: { start: string; end: string }[] | null
  notes: string | null
}

export function isoLocalDate(d: Date) {
  // Use local date components, not UTC, to ensure correct date for user's timezone
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function weekStart(d: Date) {
  const x = new Date(d); const day = x.getDay() || 7; // Mon-based: 1..7
  if (day !== 1) x.setDate(x.getDate() - (day - 1))
  x.setHours(0,0,0,0); return x
}

export async function getShiftsForWeek(start: Date) {
  const from = isoLocalDate(start)
  const toDate = new Date(start); toDate.setDate(toDate.getDate()+7)
  const to = isoLocalDate(toDate)

  const { data, error } = await supabase
    .from('shifts').select('*')
    .gte('date', from).lt('date', to)
    .order('date', { ascending: true })
  if (error) throw error
  return data as Shift[]
}

export async function upsertShift(s: Partial<Shift> & { date: string }) {
  // If OFF/AL/SICK, allow start/end null
  const { data, error } = await supabase
    .from('shifts')
    .upsert(s, { onConflict: 'user_id,date' })
    .select().single()
  if (error) throw error
  return data as Shift
}

export function labelColor(label: Shift['label'], status: Shift['status']) {
  if (status === 'SICK') return 'bg-red-100 text-red-700 border-red-200'
  if (status === 'ANNUAL_LEAVE') return 'bg-teal-100 text-teal-700 border-teal-200'
  if (status === 'OVERTIME') return 'bg-orange-100 text-orange-700 border-orange-200'
  switch (label) {
    case 'DAY': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'NIGHT': return 'bg-indigo-100 text-indigo-700 border-indigo-200'
    case 'OFF': return 'bg-slate-100 text-slate-600 border-slate-200'
    case 'ONCALL': return 'bg-purple-100 text-purple-700 border-purple-200'
    default: return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

