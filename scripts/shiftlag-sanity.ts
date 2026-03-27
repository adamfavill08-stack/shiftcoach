import { calculateShiftLag } from '../lib/shiftlag/calculateShiftLag'

type SleepDay = { date: string; totalHours: number }
type ShiftDay = { date: string; label: string; start_ts: string | null; end_ts: string | null }

function dateAt(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00.000Z`
}

function runScenario(
  name: string,
  sleepDays: SleepDay[],
  shiftDays: ShiftDay[],
  circadianMidpointMinutes?: number,
  sleepPatternContext?: { hasMainSleep?: boolean; hasNaps?: boolean },
) {
  const result = calculateShiftLag(sleepDays, shiftDays, circadianMidpointMinutes, sleepPatternContext)
  return {
    name,
    score: result.score,
    level: result.level,
    sleepDebtScore: result.sleepDebtScore,
    misalignmentScore: result.misalignmentScore,
    instabilityScore: result.instabilityScore,
    sleepDebtHours: result.sleepDebtHours,
    avgNightOverlapHours: result.avgNightOverlapHours,
    shiftStartVariabilityHours: result.shiftStartVariabilityHours,
    explanation: result.explanation,
  }
}

const sleepStableDay: SleepDay[] = [
  { date: '2026-03-01', totalHours: 8.0 },
  { date: '2026-03-02', totalHours: 8.1 },
  { date: '2026-03-03', totalHours: 7.9 },
  { date: '2026-03-04', totalHours: 8.0 },
  { date: '2026-03-05', totalHours: 8.2 },
  { date: '2026-03-06', totalHours: 8.0 },
  { date: '2026-03-07', totalHours: 7.8 },
]
const shiftsStableDay: ShiftDay[] = [
  { date: '2026-03-01', label: 'DAY', start_ts: dateAt('2026-03-01', '08:00'), end_ts: dateAt('2026-03-01', '16:00') },
  { date: '2026-03-02', label: 'DAY', start_ts: dateAt('2026-03-02', '08:00'), end_ts: dateAt('2026-03-02', '16:00') },
  { date: '2026-03-03', label: 'DAY', start_ts: dateAt('2026-03-03', '08:00'), end_ts: dateAt('2026-03-03', '16:00') },
  { date: '2026-03-04', label: 'DAY', start_ts: dateAt('2026-03-04', '08:00'), end_ts: dateAt('2026-03-04', '16:00') },
  { date: '2026-03-05', label: 'DAY', start_ts: dateAt('2026-03-05', '08:00'), end_ts: dateAt('2026-03-05', '16:00') },
]

const sleepAdaptedNight: SleepDay[] = [
  { date: '2026-03-01', totalHours: 7.7 },
  { date: '2026-03-02', totalHours: 8.0 },
  { date: '2026-03-03', totalHours: 7.9 },
  { date: '2026-03-04', totalHours: 7.8 },
  { date: '2026-03-05', totalHours: 8.1 },
  { date: '2026-03-06', totalHours: 7.8 },
  { date: '2026-03-07', totalHours: 8.0 },
]
const shiftsStableNight: ShiftDay[] = [
  { date: '2026-03-01', label: 'NIGHT', start_ts: dateAt('2026-03-01', '22:00'), end_ts: dateAt('2026-03-02', '06:00') },
  { date: '2026-03-02', label: 'NIGHT', start_ts: dateAt('2026-03-02', '22:00'), end_ts: dateAt('2026-03-03', '06:00') },
  { date: '2026-03-03', label: 'NIGHT', start_ts: dateAt('2026-03-03', '22:00'), end_ts: dateAt('2026-03-04', '06:00') },
  { date: '2026-03-04', label: 'NIGHT', start_ts: dateAt('2026-03-04', '22:00'), end_ts: dateAt('2026-03-05', '06:00') },
  { date: '2026-03-05', label: 'NIGHT', start_ts: dateAt('2026-03-05', '22:00'), end_ts: dateAt('2026-03-06', '06:00') },
]

const sleepRotating: SleepDay[] = [
  { date: '2026-03-01', totalHours: 5.2 },
  { date: '2026-03-02', totalHours: 6.0 },
  { date: '2026-03-03', totalHours: 4.8 },
  { date: '2026-03-04', totalHours: 6.1 },
  { date: '2026-03-05', totalHours: 5.0 },
  { date: '2026-03-06', totalHours: 6.2 },
  { date: '2026-03-07', totalHours: 5.3 },
]
const shiftsRotating: ShiftDay[] = [
  { date: '2026-03-01', label: 'EARLY', start_ts: dateAt('2026-03-01', '06:00'), end_ts: dateAt('2026-03-01', '14:00') },
  { date: '2026-03-02', label: 'LATE', start_ts: dateAt('2026-03-02', '14:00'), end_ts: dateAt('2026-03-02', '22:00') },
  { date: '2026-03-03', label: 'NIGHT', start_ts: dateAt('2026-03-03', '22:00'), end_ts: dateAt('2026-03-04', '06:00') },
  { date: '2026-03-04', label: 'DAY', start_ts: dateAt('2026-03-04', '08:00'), end_ts: dateAt('2026-03-04', '16:00') },
  { date: '2026-03-05', label: 'NIGHT', start_ts: dateAt('2026-03-05', '22:00'), end_ts: dateAt('2026-03-06', '06:00') },
  { date: '2026-03-06', label: 'EARLY', start_ts: dateAt('2026-03-06', '06:00'), end_ts: dateAt('2026-03-06', '14:00') },
]

const sleepNapsOnly: SleepDay[] = [
  { date: '2026-03-01', totalHours: 1.0 },
  { date: '2026-03-02', totalHours: 1.2 },
  { date: '2026-03-03', totalHours: 0.8 },
  { date: '2026-03-04', totalHours: 1.1 },
  { date: '2026-03-05', totalHours: 0.9 },
  { date: '2026-03-06', totalHours: 1.0 },
  { date: '2026-03-07', totalHours: 1.3 },
]
const shiftsDayMostly: ShiftDay[] = [
  { date: '2026-03-01', label: 'DAY', start_ts: dateAt('2026-03-01', '08:00'), end_ts: dateAt('2026-03-01', '16:00') },
  { date: '2026-03-02', label: 'DAY', start_ts: dateAt('2026-03-02', '08:00'), end_ts: dateAt('2026-03-02', '16:00') },
  { date: '2026-03-03', label: 'OFF', start_ts: null, end_ts: null },
  { date: '2026-03-04', label: 'DAY', start_ts: dateAt('2026-03-04', '08:00'), end_ts: dateAt('2026-03-04', '16:00') },
  { date: '2026-03-05', label: 'LATE', start_ts: dateAt('2026-03-05', '14:00'), end_ts: dateAt('2026-03-05', '22:00') },
]

const sleepDecentNoCircadian: SleepDay[] = [
  { date: '2026-03-01', totalHours: 7.4 },
  { date: '2026-03-02', totalHours: 7.8 },
  { date: '2026-03-03', totalHours: 7.6 },
  { date: '2026-03-04', totalHours: 7.5 },
  { date: '2026-03-05', totalHours: 7.7 },
  { date: '2026-03-06', totalHours: 7.6 },
  { date: '2026-03-07', totalHours: 7.5 },
]

const results = [
  runScenario('1) Stable day shifts + stable night sleep', sleepStableDay, shiftsStableDay, 180),
  runScenario('2) Stable night shifts + adapted daytime sleep', sleepAdaptedNight, shiftsStableNight, 720),
  runScenario('3) Rotating shifts + moving sleep midpoint', sleepRotating, shiftsRotating, 300),
  runScenario(
    '4) Fragmented naps only + no main sleep proxy',
    sleepNapsOnly,
    shiftsDayMostly,
    180,
    { hasMainSleep: false, hasNaps: true },
  ),
  runScenario('5) No circadian logs + decent main sleep history', sleepDecentNoCircadian, shiftsDayMostly),
]

console.log('\nShiftLag scenario sanity results:\n')
for (const r of results) {
  console.log(`${r.name}`)
  console.log(`  score=${r.score} level=${r.level}`)
  console.log(
    `  components debt=${r.sleepDebtScore} misalign=${r.misalignmentScore} instability=${r.instabilityScore}`,
  )
  console.log(
    `  drivers debtHours=${r.sleepDebtHours} overlap=${r.avgNightOverlapHours}h variability=${r.shiftStartVariabilityHours}h`,
  )
  console.log(`  explanation=${r.explanation}\n`)
}
