"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useWeeklyProgress } from "@/lib/hooks/useWeeklyProgress"
import { useTranslation } from "@/components/providers/language-provider"

type ShiftRhythmResponse = {
  score?: {
    total_score?: number
  }
  hasRhythmData?: boolean
}

export default function BodyClockPage() {
  const { t } = useTranslation()
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
    if (noData) return t("dashboard.bodyClock.comingSoon")
    if (displayScore >= 80) return t("dashboard.bodyClock.stronglyAligned")
    if (displayScore >= 70) return t("dashboard.bodyClock.inSync")
    if (displayScore >= 55) return t("dashboard.bodyClock.slightlyOut")
    return t("dashboard.bodyClock.outOfSync")
  }, [displayScore, noData, t])

  const subText = noData
    ? t("dashboard.bodyClock.unlockHint")
    : t("dashboard.bodyClock.calculatedFrom")

  const bodyClockScores = weekly?.bodyClockScores ?? []
  const sleepTimingScores = weekly?.sleepTimingScore ?? []

  const lowDays = bodyClockScores.filter((s) => s < 55).length
  const mediumDays = bodyClockScores.filter((s) => s >= 55 && s < 70).length

  const patternLabel =
    lowDays === 0 && mediumDays <= 2
      ? t("detail.bodyClock.patternStable")
      : lowDays >= 4
      ? t("detail.bodyClock.patternHeavy")
      : mediumDays + lowDays >= 4
      ? t("detail.bodyClock.patternChoppy")
      : t("detail.bodyClock.patternMixed")

  const timingAvg =
    sleepTimingScores.length > 0
      ? sleepTimingScores.reduce((a, b) => a + b, 0) / sleepTimingScores.length
      : null

  const timingLabel =
    timingAvg == null
      ? t("detail.bodyClock.timingNoData")
      : timingAvg >= 75
      ? t("detail.bodyClock.timingRegular")
      : timingAvg >= 55
      ? t("detail.bodyClock.timingShifting")
      : t("detail.bodyClock.timingFlipped")

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {t("detail.bodyClock.title")}
          </h1>
        </header>

        {/* Hero body clock gauge */}
        <section className="rounded-2xl bg-white px-5 py-5 flex flex-col items-center gap-4">
          <CircadianGauge score={displayScore} />

          <div className="w-full flex-1 space-y-2 text-center max-w-xs">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
              {t("detail.bodyClock.scoreLabel")}
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
                {t("detail.bodyClock.overLast7")}
              </p>
              <p className="text-[11px] text-slate-600">
                {t("detail.bodyClock.higherBars")}
              </p>
            </div>
          </div>

          <BodyClockWeeklyStrip weekly={weekly} t={t} />
        </section>

        {/* Shift pattern vs recovery */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            {t("detail.bodyClock.patternVsRecovery")}
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {patternLabel}
          </p>
          <p className="text-[11px] text-slate-600">
            {t("detail.bodyClock.patternExplanation")}
          </p>
        </section>

        {/* Sleep timing consistency */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            {t("detail.bodyClock.sleepTiming")}
          </p>
          <p className="text-[11px] text-slate-600">
            {timingLabel}
          </p>
          <p className="text-[11px] text-slate-600">
            {t("detail.bodyClock.timingTip")}
          </p>
        </section>

        {/* Light exposure & night‑shift protection */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            {t("detail.bodyClock.lightHabits")}
          </p>
          <ul className="text-[11px] text-slate-600 space-y-1.5">
            <li>• {t("detail.bodyClock.lightDay")}</li>
            <li>• {t("detail.bodyClock.lightNight")}</li>
            <li>• {t("detail.bodyClock.lightEvening")}</li>
          </ul>
        </section>

        {/* Upcoming risk window */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            {t("detail.bodyClock.riskWindow")}
          </p>
          <p className="text-[11px] text-slate-600">
            {t("detail.bodyClock.riskWindowText")}
          </p>
        </section>

        {/* ShiftCoach logo footer */}
        <div className="pt-6 pb-4 flex flex-col items-center gap-1">
          <div className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-400">
            ShiftCoach
          </div>
          <p className="text-[10px] text-slate-400 text-center max-w-[260px]">
            {t("detail.common.disclaimer")}
          </p>
        </div>
      </div>
    </main>
  )
}

function BodyClockWeeklyStrip({ weekly, t }: { weekly: ReturnType<typeof useWeeklyProgress>; t: (key: string) => string }) {
  const days = weekly?.days ?? []
  const scores = weekly?.bodyClockScores ?? []

  if (!days.length || !scores.length) {
    return (
      <p className="text-[11px] text-slate-500">
        {t("detail.bodyClock.waitingData")}
      </p>
    )
  }

  const maxScore = Math.max(...scores, 1)
  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "short" })

  const lowDays = scores.filter((s) => s < 55).length
  const mediumDays = scores.filter((s) => s >= 55 && s < 70).length

  let warning = t("detail.bodyClock.warningMixed")
  if (lowDays === 0 && mediumDays <= 2) {
    warning = t("detail.bodyClock.warningStable")
  } else if (lowDays >= 4) {
    warning = t("detail.bodyClock.warningOutOfSync")
  } else if (lowDays >= 2 || mediumDays >= 4) {
    warning = t("detail.bodyClock.warningQuiteFew")
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

