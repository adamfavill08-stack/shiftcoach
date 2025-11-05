import { isoLocalDate } from './shifts'

export type PatternKind = '4on4off'

export function buildPattern(opts: {
  kind: PatternKind
  startDate: Date                  // first day of pattern
  startLabel: 'DAY'|'NIGHT'        // which block starts first
  dayStart: string                 // '06:30'
  dayEnd: string                   // '18:30'
  nightStart: string               // '18:30'
  nightEnd: string                 // '06:30'
  weeks: number                    // how many weeks forward to generate
}) {
  const out: { date: string; label: 'DAY'|'NIGHT'|'OFF'; start: string|null; end: string|null }[] = []
  const totalDays = opts.weeks * 7
  let block = opts.startLabel    // current working block ('DAY' or 'NIGHT'), alternates every 4 days
  let idxInBlock = 0

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(opts.startDate)
    d.setDate(d.getDate() + i)
    const iso = isoLocalDate(d)

    // 4-on / 4-off rule
    const cyclePos = i % 8
    if (cyclePos < 4) {
      // on-days
      if (block === 'DAY') {
        out.push({ date: iso, label: 'DAY', start: at(iso, opts.dayStart), end: endAt(iso, opts.dayEnd, false) })
      } else {
        out.push({ date: iso, label: 'NIGHT', start: at(iso, opts.nightStart), end: endAt(iso, opts.nightEnd, true) })
      }
      idxInBlock++
      if (idxInBlock === 4) { idxInBlock = 0; block = (block === 'DAY' ? 'NIGHT' : 'DAY') }
    } else {
      // off-days
      out.push({ date: iso, label: 'OFF', start: null, end: null })
    }
  }
  return out
}

function at(isoDate: string, hhmm: string) {
  const [hh, mm] = hhmm.split(':').map(Number)
  const d = new Date(isoDate + 'T00:00:00')
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

// if crossesMidnight=true, roll end to next day when <= start
function endAt(isoDate: string, hhmm: string, crossesMidnight: boolean) {
  const start = new Date(isoDate + 'T00:00:00')
  const [eh, em] = hhmm.split(':').map(Number)
  const e = new Date(isoDate + 'T00:00:00')
  e.setHours(eh, em, 0, 0)
  if (crossesMidnight || e <= start) e.setDate(e.getDate() + 1)
  return e.toISOString()
}

