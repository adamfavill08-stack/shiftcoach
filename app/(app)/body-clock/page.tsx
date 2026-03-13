"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useWeeklyProgress } from "@/lib/hooks/useWeeklyProgress"

type ShiftRhythmResponse = {
  score?: {
    total_score?: number
  }
  hasRhythmData?: boolean
}

export default function BodyClockPage() {
  const [totalScore, setTotalScore] = useState<number | null>(null)
  const [hasRhythmData, setHasRhythmData] = useState<boolean | undefined>(undefined)
  const weekly = useWeeklyProgress()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/shift-rhythm", { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json().catch(() => ({}))) as ShiftRhythmResponse
        if (!cancelled) {
          setTotalScore(
            typeof json?.score?.total_score === "number" ? json.score.total_score : null
          )
          setHasRhythmData(json?.hasRhythmData)
        }
      } catch {
        if (!cancelled) {
          setTotalScore(null)
          setHasRhythmData(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const displayScore = useMemo(() => {
    if (totalScore == null || Number.isNaN(totalScore)) return 0
    return Math.min(Math.max(Math.round(totalScore), 0), 100)
  }, [totalScore])

  const noData = hasRhythmData === false || displayScore <= 0

  const headingText = useMemo(() => {
    if (noData) return "Body clock score coming soon"
    if (displayScore >= 80) return "Your body clock is strongly aligned"
    if (displayScore >= 70) return "Your body clock is in sync"
    if (displayScore >= 55) return "Your body clock is slightly out of sync"
    return "Your body clock is out of sync"
  }, [displayScore, noData])

  const subText = noData
    ? "Log a few nights of sleep and add your shifts to unlock your Body Clock score."
    : "Calculated from your recent sleep, rota pattern and light timing over the last few days."

  const bodyClockScores = weekly?.bodyClockScores ?? []
  const sleepTimingScores = weekly?.sleepTimingScore ?? []

  const lowDays = bodyClockScores.filter((s) => s < 55).length
  const mediumDays = bodyClockScores.filter((s) => s >= 55 && s < 70).length

  const patternLabel =
    lowDays === 0 && mediumDays <= 2
      ? "Pattern: mostly stable"
      : lowDays >= 4
      ? "Pattern: heavy strain week"
      : mediumDays + lowDays >= 4
      ? "Pattern: choppy week"
      : "Pattern: mixed"

  const timingAvg =
    sleepTimingScores.length > 0
      ? sleepTimingScores.reduce((a, b) => a + b, 0) / sleepTimingScores.length
      : null

  const timingLabel =
    timingAvg == null
      ? "Not enough sleep timing data yet."
      : timingAvg >= 75
      ? "Your main sleep has been fairly regular this week."
      : timingAvg >= 55
      ? "Sleep timing is shifting around – watch late finishes and early starts close together."
      : "Sleep timing has been flipped or very irregular – your body clock is working hard to keep up with shifts."

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Body clock
          </h1>
        </header>

        {/* Hero body clock gauge */}
        <section className="rounded-2xl bg-white px-5 py-5 flex flex-col items-center gap-4">
          <CircadianGauge score={displayScore} />

          <div className="w-full flex-1 space-y-2 text-center max-w-xs">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
              Body clock score
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {headingText}
            </p>
            <p className="text-[11px] text-slate-600">
              {subText}
            </p>
          </div>
        </section>

        {/* Last 7 days body clock trend */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
                Body clock over last 7 days
              </p>
              <p className="text-[11px] text-slate-600">
                Higher bars = days your body clock was more in rhythm with your shifts.
              </p>
            </div>
          </div>

          <BodyClockWeeklyStrip weekly={weekly} />
        </section>

        {/* Shift pattern vs recovery */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            Shift pattern vs recovery
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {patternLabel}
          </p>
          <p className="text-[11px] text-slate-600">
            This looks at how many days your body clock score dipped below the in‑sync range. Runs of
            nights, very short turnarounds or long commutes can pull several days down in a row.
          </p>
        </section>

        {/* Sleep timing consistency */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            Sleep timing consistency
          </p>
          <p className="text-[11px] text-slate-600">
            {timingLabel}
          </p>
          <p className="text-[11px] text-slate-600">
            Try to keep at least 3 nights in a row with similar main‑sleep timing on off‑days so your
            body clock can catch up between heavy runs of shifts.
          </p>
        </section>

        {/* Light exposure & night‑shift protection */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            Light habits that protect your clock
          </p>
          <ul className="text-[11px] text-slate-600 space-y-1.5">
            <li>• Day shifts: aim for 15–20 minutes of outside light most days.</li>
            <li>• Night shifts: wear sunglasses on the way home and keep the bedroom dark.</li>
            <li>• Evenings off: dim screens and bright lights 1–2 hours before planned sleep.</li>
          </ul>
        </section>

        {/* Upcoming risk window */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            Upcoming risk window
          </p>
          <p className="text-[11px] text-slate-600">
            Based on this week&apos;s pattern, your body clock will find runs of nights, early
            starts and short turnarounds hardest. Treat the days after these blocks as recovery
            shifts: protect sleep, keep caffeine early and keep meals lighter overnight.
          </p>
        </section>

        {/* ShiftCoach logo footer */}
        <div className="pt-6 pb-4 flex flex-col items-center gap-1">
          <div className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-400">
            ShiftCoach
          </div>
          <p className="text-[10px] text-slate-400 text-center max-w-[260px]">
            A coaching app only and does not replace medical advice. Please speak to a healthcare
            professional about any health concerns.
          </p>
        </div>
      </div>
    </main>
  )
}

function BodyClockWeeklyStrip({ weekly }: { weekly: ReturnType<typeof useWeeklyProgress> }) {
  const days = weekly?.days ?? []
  const scores = weekly?.bodyClockScores ?? []

  if (!days.length || !scores.length) {
    return (
      <p className="text-[11px] text-slate-500">
        Waiting for enough sleep and shift data to show your 7‑day body clock trend.
      </p>
    )
  }

  const maxScore = Math.max(...scores, 1)
  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "short" })

  const lowDays = scores.filter((s) => s < 55).length
  const mediumDays = scores.filter((s) => s >= 55 && s < 70).length

  let warning =
    "Mixed week – keep an eye on runs of nights and very short sleeps."
  if (lowDays === 0 && mediumDays <= 2) {
    warning = "Your body clock has mostly stayed in rhythm this week – keep protecting recovery days."
  } else if (lowDays >= 4) {
    warning =
      "Your body clock has been out of sync on most days – treat upcoming days as recovery where you can and check your rota pattern."
  } else if (lowDays >= 2 || mediumDays >= 4) {
    warning =
      "Quite a few days out of rhythm – watch stretches of nights, early starts and broken sleep."
  }

  return (
    <div className="space-y-2">
      <div className="mt-1 flex items-end justify-between gap-2 pt-1">
        {days.map((label, idx) => {
          const score = scores[idx] ?? 0
          const heightPct = Math.max(10, Math.round((score / maxScore) * 100))

          const toneClass =
            score >= 70 ? "bg-emerald-400" : score >= 55 ? "bg-amber-400" : "bg-rose-400"

          const isToday = label === todayLabel

          return (
            <div key={`${label}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-2 rounded-full ${toneClass}`}
                style={{ height: `${heightPct}%`, minHeight: "12px" }}
              />
              <span
                className={`text-[9px] uppercase tracking-[0.12em] ${
                  isToday ? "text-slate-900 font-semibold" : "text-slate-500"
                }`}
              >
                {label.charAt(0)}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-slate-600">{warning}</p>
    </div>
  )
}

function CircadianGauge({ score }: { score: number }) {
  const size = 176
  const radius = 80
  const stroke = 8
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const capped = Math.min(Math.max(score, 0), 100)
  const offset = circumference * (1 - capped / 100)

  return (
    <div className="relative flex h-44 w-44 items-center justify-center">
      <svg
        height={size}
        width={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        <defs>
          <linearGradient id="bodyClockTrackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5E7EB" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="bodyClockActiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={normalizedRadius}
          fill="white"
          stroke="url(#bodyClockTrackGradient)"
          strokeWidth={stroke}
        />

        {/* Active arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={normalizedRadius}
          fill="none"
          stroke="url(#bodyClockActiveGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-3xl font-semibold text-slate-900 tabular-nums leading-none">
          {Math.round(capped)}
        </p>
      </div>
    </div>
  )
}

