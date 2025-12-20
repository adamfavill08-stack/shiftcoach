'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useWeeklyProgress } from '@/lib/hooks/useWeeklyProgress'
import { WeeklySummaryCard } from '@/components/dashboard/WeeklySummaryCard'
import { WeeklyGoalsCard } from '@/components/dashboard/WeeklyGoalsCard'

function Sparkline({ values, color='currentColor' }:{ values: number[]; color?: string }){
  if (!values.length) return null
  const w = 320, h = 48
  const min = Math.min(...values)
  const max = Math.max(...values)
  const norm = (v:number) => max === min ? h/2 : h - ((v - min) / (max - min)) * h
  const step = w / (values.length - 1)
  const d = values.map((v,i)=>`${i===0?'M':'L'} ${i*step},${norm(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12"> 
      <path d={d} stroke={color} strokeWidth={2} fill="none" />
    </svg>
  )
}

function CircadianRhythmCard({
  scores,
  days,
  hasRealData,
  loading,
}: {
  scores: number[]
  days: string[]
  hasRealData?: boolean
  loading?: boolean
}) {
  if (!scores.length) return null

  const data = scores.slice(0, 7)
  const labels = days.slice(0, 7)

  const maxScore = Math.max(...data)
  const minScore = Math.min(...data)
  const peakIndex = data.findIndex((v) => v === maxScore)

  const width = 320
  const height = 140
  const paddingX = 8
  const paddingTop = 10
  const paddingBottom = 26

  const usableHeight = height - paddingTop - paddingBottom
  const stepX = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0
  const normY = (v: number) =>
    minScore === maxScore
      ? paddingTop + usableHeight / 2
      : paddingTop + usableHeight - ((v - minScore) / (maxScore - minScore)) * usableHeight

  const points = data.map((v, i) => ({
    x: paddingX + i * stepX,
    y: normY(v),
    value: v,
  }))

  const pathD =
    points.length === 1
      ? `M ${points[0].x} ${points[0].y}`
      : points
          .map((p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`
            const prev = points[i - 1]
            const cx = (prev.x + p.x) / 2
            return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
          })
          .join(' ')

  const areaD =
    points.length === 1
      ? `M ${points[0].x} ${height - paddingBottom} L ${points[0].x} ${points[0].y} L ${
          points[0].x
        } ${height - paddingBottom} Z`
      : `M ${points[0].x} ${height - paddingBottom} ` +
        points
          .map((p, i) => {
            if (i === 0) return `L ${p.x} ${p.y}`
            const prev = points[i - 1]
            const cx = (prev.x + p.x) / 2
            return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
          })
          .join(' ') +
        ` L ${points[points.length - 1].x} ${height - paddingBottom} Z`

  const peakPoint = points[peakIndex]

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-700/40 bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl px-5 pt-5 pb-4 flex flex-col gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
    >
      {/* subtle premium overlays */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/95 dark:from-slate-900/70 via-white/85 dark:via-slate-900/50 to-white/80 dark:to-slate-950/60" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-sky-50/45 dark:from-sky-950/20 via-transparent to-indigo-50/35 dark:to-indigo-950/20" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[23px] ring-1 ring-white/60 dark:ring-slate-600/30" />

      <div className="relative z-10 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Last 7 Days
          </p>
          <h2 className="mt-1 text-[18px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Circadian Rhythm
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[230px]">
            A quick snapshot of how aligned your body clock has been with your ideal rhythm this
            week.
          </p>
        </div>
        <div className="inline-flex flex-col items-end gap-1">
          {hasRealData ? (
            <>
              <span className="inline-flex items-center rounded-full bg-slate-900 dark:bg-slate-100 px-3 py-1 text-[11px] font-semibold text-white dark:text-slate-900 shadow-[0_10px_26px_rgba(15,23,42,0.35)] dark:shadow-[0_10px_26px_rgba(255,255,255,0.1)]">
                Weekly peak&nbsp;
                <span className="ml-1 rounded-full bg-white/10 dark:bg-slate-900/10 px-2 py-0.5 text-[11px]">
                  {maxScore}
                </span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                Stability: {Math.max(0, 100 - Math.round(peakIndex * 4))}/100
              </span>
            </>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800/50 px-3 py-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/40">
              We'll show your first 7-day rhythm once enough sleep & shift data is logged.
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[150px]">
          <defs>
            <linearGradient id="circadian-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="circadian-area" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(59,130,246,0.35)" />
              <stop offset="70%" stopColor="rgba(59,130,246,0.04)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Soft background grid */}
          <g className="stroke-slate-300/30 dark:stroke-slate-600/30" strokeWidth="0.5">
            {[0, 1, 2, 3, 4].map((i) => {
              const y = paddingTop + (usableHeight / 4) * i
              return <line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} />
            })}
          </g>

          {hasRealData ? (
            <>
              {/* Area under curve */}
              <path d={areaD} fill="url(#circadian-area)" />

              {/* Curve */}
              <path
                d={pathD}
                stroke="url(#circadian-line)"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />

              {/* Peak glow */}
              {peakPoint && (
                <>
              <circle
                cx={peakPoint.x}
                cy={peakPoint.y}
                r={16}
                fill="rgba(59,130,246,0.25)"
                className="blur-[6px]"
              />
              <circle cx={peakPoint.x} cy={peakPoint.y} r={7} fill="#ffffff" />
              <circle cx={peakPoint.x} cy={peakPoint.y} r={5} fill="#2563eb" />
              <text
                x={peakPoint.x}
                y={peakPoint.y - 18}
                textAnchor="middle"
                className="text-[11px] font-semibold fill-blue-600 dark:fill-blue-400"
              >
                {peakPoint.value}
              </text>
            </>
              )}
            </>
          ) : (
            <>
              {/* Placeholder baseline curve */}
              <path
                d={`M ${paddingX} ${paddingTop + usableHeight * 0.6} L ${
                  width - paddingX
                } ${paddingTop + usableHeight * 0.6}`}
                className="stroke-slate-400/50 dark:stroke-slate-500/50"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="none"
              />
            </>
          )}

          {/* Y-axis labels (0–100) */}
          {[0, 25, 50, 75, 100].map((val, idx) => {
            const y =
              paddingTop +
              usableHeight -
              ((val - 0) / (100 - 0 || 1)) * usableHeight
            return (
              <text
                key={idx}
                x={0}
                y={y + 3}
                fontSize="9"
                className="fill-slate-500 dark:fill-slate-400"
              >
                {val}
              </text>
            )
          })}

          {/* Day labels */}
          {labels.map((label, i) => (
            <text
              key={label + i}
              x={paddingX + i * stepX}
              y={height - 8}
              textAnchor="middle"
              fontSize="9"
              className="fill-slate-500 dark:fill-slate-400"
            >
              {label.toUpperCase().slice(0, 3)}
            </text>
          ))}
        </svg>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
        {hasRealData
          ? 'Higher points mean your body clock was more in sync with your ideal rhythm. Dips often follow night shifts, irregular sleep, or disrupted routines.'
          : 'Once we have a full week of sleep and shift data, this card will begin to show how your body clock is adapting to your pattern.'}
      </p>
      </div>
    </section>
  )
}

function CircadianRhythmReport({
  scores,
  sleepHours,
  sleepTiming,
  days,
  hasRealData,
}: {
  scores: number[]
  sleepHours: number[]
  sleepTiming: number[]
  days: string[]
  hasRealData?: boolean
}) {
  if (!scores.length) return null

  const data = scores.slice(0, 7)
  const sleep = sleepHours.slice(0, 7)
  const timing = sleepTiming.slice(0, 7)
  const labels = days.slice(0, 7)

  const avgScore = Math.round(data.reduce((a, b) => a + b, 0) / data.length)
  const first = data[0]
  const last = data[data.length - 1]
  const trendDelta = last - first
  const direction: 'up' | 'down' | 'flat' =
    Math.abs(trendDelta) < 3 ? 'flat' : trendDelta > 0 ? 'up' : 'down'

  const maxScore = Math.max(...data)
  const minScore = Math.min(...data)
  const bestIndex = data.findIndex((v) => v === maxScore)
  const worstIndex = data.findIndex((v) => v === minScore)

  const mean =
    data.reduce((a, b) => a + b, 0) / data.length
  const variance =
    data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / data.length
  const stdDev = Math.sqrt(variance)
  const stabilityScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 2.2)))

  let headline: string
  if (direction === 'up' && avgScore >= 65 && stabilityScore >= 60) {
    headline = 'Your rhythm has improved this week — your body is stabilising.'
  } else if (direction === 'down' && avgScore <= 60) {
    headline = 'Your rhythm is drifting — recent shifts are pulling you off track.'
  } else if (avgScore >= 75 && stabilityScore >= 70) {
    headline = 'Strong alignment this week — your routine is really paying off.'
  } else if (stabilityScore < 50) {
    headline = 'Your rhythm has been choppy — this week was harder on your body clock.'
  } else {
    headline = 'Your rhythm is holding steady — small tweaks could move it higher.'
  }

  const patterns: string[] = []
  if (direction === 'up') {
    patterns.push(
      'Alignment has trended upward across the week — your body is adapting to your pattern.',
    )
  } else if (direction === 'down') {
    patterns.push(
      'Alignment has slipped compared with the start of the week, likely from schedule pressure.',
    )
  }
  if (stabilityScore >= 70) {
    patterns.push('Your circadian rhythm was quite stable — very few big swings day to day.')
  } else if (stabilityScore <= 45) {
    patterns.push(
      'Large day-to-day swings suggest irregular sleep timing or disruptive shift changes.',
    )
  }
  const avgSleep = sleep.reduce((a, b) => a + b, 0) / sleep.length
  if (avgSleep < 7) {
    patterns.push('Average sleep was under 7 hours, which keeps alignment under pressure.')
  } else {
    patterns.push('Sleep duration was generally solid, giving your rhythm a good foundation.')
  }

  const feeling: string =
    avgScore >= 75
      ? 'You likely felt more daytime energy, clearer focus and fewer heavy crashes.'
      : avgScore <= 55
      ? 'You may have noticed more fatigue, foggier thinking and slower reaction times.'
      : 'You were probably in a mid-range zone — functional most days but sensitive to late nights and shift changes.'

  const adjustments: string[] = []
  if (direction === 'down' || stabilityScore < 60) {
    adjustments.push(
      'Aim to keep bedtime within about 60–90 minutes on both work days and days off.',
    )
  }
  if (avgSleep < 7.2) {
    adjustments.push('Build in one extra 30–60 minutes of sleep on 2–3 nights to lower sleep debt.')
  }
  adjustments.push(
    'Try to get 10 minutes of light (daylight if possible) within an hour of waking to anchor your clock.',
  )
  adjustments.push(
    'On night or very late shifts, plan a short pre-shift nap instead of pushing through heavy fatigue.',
  )

  const forecast =
    direction === 'up'
      ? 'If you repeat this pattern, your rhythm is likely to stabilise further over the next week.'
      : direction === 'down'
      ? 'If this pattern repeats, your rhythm will likely dip again midweek — especially around demanding shifts.'
      : 'With a similar week, your rhythm should stay in a similar range — small upgrades will nudge it upward.'

  const milestones: string[] = []
  if (avgScore > 70) {
    milestones.push('This is one of your stronger alignment weeks — keep the structure you liked.')
  }
  if (maxScore - minScore >= 15) {
    milestones.push(
      'You had at least one very strong day — use that as a template for sleep and routine on other days.',
    )
  }

  if (!hasRealData) {
    return (
      <section
        className="relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-700/40 bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl px-5 pt-5 pb-4 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
      >
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/95 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-slate-50/90 dark:to-slate-950/60" />
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-slate-50/60 dark:from-slate-800/50 via-transparent to-slate-100/70 dark:to-slate-900/50" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[23px] ring-1 ring-white/70 dark:ring-slate-600/30" />

        <div className="relative z-10 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Weekly circadian report
          </p>
          <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            We're still learning your rhythm.
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            After you've logged around a week of sleep and shift data, ShiftCoach will start
            building a full circadian report here with trends, patterns and next steps tailored to
            you.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-700/40 bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl px-5 pt-5 pb-4 flex flex-col gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
    >
      {/* soft report overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/95 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-slate-50/90 dark:to-slate-950/60" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-slate-50/60 dark:from-slate-800/50 via-transparent to-slate-100/70 dark:to-slate-900/50" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[23px] ring-1 ring-white/70 dark:ring-slate-600/30" />

      <div className="relative z-10 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Weekly circadian report
        </p>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">{headline}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Your average alignment score was <span className="font-semibold">{avgScore}</span> with a
          stability score of <span className="font-semibold">{stabilityScore}</span>. Peaks and
          dips tell the story of how your shifts, sleep timing and routines played out.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="rounded-2xl bg-white/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40 px-3 py-2.5 shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-1">
            Best aligned day
          </p>
          <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {labels[bestIndex] ?? '—'} · {maxScore}
          </p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-400">
            Your rhythm locked in best here — repeat the sleep and light routine from this day
            where you can.
          </p>
        </div>
        <div className="rounded-2xl bg-white/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40 px-3 py-2.5 shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-1">
            Toughest day
          </p>
          <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {labels[worstIndex] ?? '—'} · {minScore}
          </p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-400">
            Likely after a demanding shift, short sleep or irregular timing — this is where your
            body felt the strain.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Daily rhythm snapshot</p>
        <div className="space-y-1.5">
          {data.map((score, i) => {
            const sleepH = sleep[i] ?? null
            const timingScore = timing[i] ?? null
            const deficit = sleepH != null ? Math.max(0, 7.5 - sleepH) : null
            return (
              <div
                key={`${labels[i]}-${i}`}
                className="flex items-center justify-between rounded-xl bg-white/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40 px-3 py-1.5 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 font-semibold text-slate-900 dark:text-slate-100">
                    {(labels[i] ?? '').toUpperCase().slice(0, 3)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Score <span className="font-semibold text-slate-900 dark:text-slate-100">{score}</span> · Sleep{' '}
                    {sleepH != null ? `${sleepH.toFixed(1)}h` : '—'}
                    {deficit && deficit >= 0.8 ? ` (debt ~${deficit.toFixed(1)}h)` : ''}
                  </span>
                </div>
                {timingScore != null && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Timing {timingScore}% aligned
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Patterns we noticed</p>
        <ul className="list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          {patterns.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">How you may have felt</p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{feeling}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Next week, focus on</p>
        <ul className="list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          {adjustments.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Looking ahead</p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{forecast}</p>
      </div>

      {milestones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">Wins to keep building on</p>
          <ul className="list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            {milestones.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </section>
  )
}

export default function ProgressPage(){
  const [weekOffset, setWeekOffset] = useState(0)
  const w = useWeeklyProgress(weekOffset)

  const weeklyBodyClockAvg = useMemo(()=> Math.round(w.bodyClockScores.reduce((a,b)=>a+b,0)/w.bodyClockScores.length), [w.bodyClockScores])
  const caloriesAdherence = useMemo(()=>{
    const days = w.days.length
    let on = 0
    for (let i=0;i<days;i++){
      const target = w.adjustedCalories[i] || 1
      const eaten = w.caloriesConsumed[i] || 0
      const diff = Math.abs(eaten - target) / target
      if (diff <= 0.10) on++
    }
    const deltaAvg = Math.round((w.caloriesConsumed.reduce((a,b)=>a+b,0) - w.adjustedCalories.reduce((a,b)=>a+b,0)) / days)
    return { daysOnTarget:on, daysTotal:days, percent: Math.round(on/days*100), deltaLabel: deltaAvg>0?`+${deltaAvg}`:`${deltaAvg}` }
  }, [w])

  const macroStats = useMemo(()=>{
    const avg = (arr:number[]) => Math.round(arr.reduce((a,b)=>a+b,0)/arr.length)
    // Simple adherence: within ±15% of average
    const mk = (arr:number[])=>{
      const average = avg(arr)
      const tol = average * 0.15
      const on = arr.filter(v => Math.abs(v-average) <= tol).length
      return { avg: average, adherencePercent: Math.round(on/arr.length*100) }
    }
    return {
      protein: mk(w.proteinG),
      carbs: mk(w.carbsG),
      fats: mk(w.fatsG),
    }
  }, [w]) as any

  // Meal logging removed - stats no longer tracked

  const avgSleepHours = useMemo(()=> w.sleepHours.reduce((a,b)=>a+b,0)/w.sleepHours.length, [w])
  const minSleepHours = useMemo(()=> Math.min(...w.sleepHours), [w])
  const maxSleepHours = useMemo(()=> Math.max(...w.sleepHours), [w])
  const avgSleepAlignment = useMemo(()=> Math.round(w.sleepTimingScore.reduce((a,b)=>a+b,0)/w.sleepTimingScore.length), [w])

  const avgMood = useMemo(()=> w.moodScores.reduce((a,b)=>a+b,0)/w.moodScores.length, [w])
  const avgFocus = useMemo(()=> w.focusScores.reduce((a,b)=>a+b,0)/w.focusScores.length, [w])

  const totalCoachChats = useMemo(()=> w.coachInteractions.reduce((a,b)=>a+b,0), [w])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 dark:from-slate-950 via-white dark:via-slate-900 to-slate-50 dark:to-slate-950">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center justify-between mb-1">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 bg-white/60 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-all hover:bg-white/80 dark:hover:bg-slate-800/70"
            aria-label="Back"
          >
            ←
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Progress</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Your last 7 days at a glance.</p>
          </div>
          <div className="flex items-center gap-2">
            {w.hasNewInsights && (
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 dark:from-sky-600 to-indigo-500 dark:to-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.55)] dark:shadow-[0_8px_18px_rgba(37,99,235,0.65)] animate-pulse-slow">
                New insight detected
              </span>
            )}
            <div className="inline-flex items-center rounded-full backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-800/50 px-3 py-1 text-xs gap-2 text-slate-600 dark:text-slate-400">
            <button
              onClick={()=>setWeekOffset(weekOffset-1)}
              className="transition-colors text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ‹
            </button>
            <span>{weekOffset===0? 'This week' : weekOffset===-1? 'Next week' : `${Math.abs(weekOffset)}w ${weekOffset<0?'ahead':'ago'}`}</span>
            <button
              onClick={()=>setWeekOffset(weekOffset+1)}
              className="transition-colors text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ›
            </button>
            </div>
          </div>
        </header>

        {/* Circadian rhythm snapshot */}
        <CircadianRhythmCard
          scores={w.bodyClockScores}
          days={w.days}
          hasRealData={w.hasRealData}
          loading={w.loading}
        />
        <CircadianRhythmReport
          scores={w.bodyClockScores}
          sleepHours={w.sleepHours}
          sleepTiming={w.sleepTimingScore}
          days={w.days}
          hasRealData={w.hasRealData}
        />
      </div>
    </main>
  )
}
