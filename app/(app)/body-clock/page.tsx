"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useWeeklyProgress } from "@/lib/hooks/useWeeklyProgress"
import {
  computeSleepComposite,
  shiftRhythmTotalToGauge100,
} from "@/lib/shift-rhythm/shiftRhythmDisplay"
import { getShiftRhythmMessage, type ShiftRhythmScores } from "@/lib/shift-rhythm/engine"
import { useTranslation } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

type ShiftRhythmResponse = {
  score?: Partial<ShiftRhythmScores> & { total_score?: number }
  hasRhythmData?: boolean
}

function parseScore(json: ShiftRhythmResponse): ShiftRhythmScores | null {
  const s = json?.score
  if (!s || typeof s.total_score !== "number") return null
  const n = (v: unknown, d = 0) => (typeof v === "number" && !Number.isNaN(v) ? v : d)
  return {
    sleep_score: n(s.sleep_score),
    regularity_score: n(s.regularity_score),
    shift_pattern_score: n(s.shift_pattern_score),
    recovery_score: n(s.recovery_score),
    nutrition_score: n(s.nutrition_score),
    activity_score: n(s.activity_score),
    meal_timing_score: n(s.meal_timing_score),
    total_score: s.total_score,
  }
}

function ScoreBarRow({
  label,
  hint,
  value,
  muted,
}: {
  label: string
  hint: string
  value: number
  muted?: boolean
}) {
  const v = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="space-y-1.5 py-3 border-b border-slate-100 last:border-0">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900 shrink-0">{v}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            muted
              ? "bg-slate-300"
              : "bg-gradient-to-r from-sky-500 to-indigo-500",
          )}
          style={{ width: `${v}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500 leading-snug">{hint}</p>
    </div>
  )
}

export default function BodyClockPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<ShiftRhythmScores | null>(null)
  const [hasRhythmData, setHasRhythmData] = useState<boolean | undefined>(undefined)
  const weekly = useWeeklyProgress()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/shift-rhythm", { cache: "no-store" })
        if (!res.ok) {
          if (!cancelled) {
            setDetail(null)
            setHasRhythmData(false)
          }
          return
        }
        const json = (await res.json().catch(() => ({}))) as ShiftRhythmResponse
        if (!cancelled) {
          setHasRhythmData(json?.hasRhythmData)
          setDetail(parseScore(json))
        }
      } catch {
        if (!cancelled) {
          setDetail(null)
          setHasRhythmData(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const displayScore = useMemo(
    () => shiftRhythmTotalToGauge100(detail?.total_score ?? null),
    [detail?.total_score],
  )

  const noData = hasRhythmData === false || (!loading && detail == null)

  const headingText = useMemo(() => {
    if (loading) return t("detail.bodyClock.loading")
    if (noData || detail == null) return t("dashboard.bodyClock.comingSoon")
    if (displayScore >= 80) return t("dashboard.bodyClock.stronglyAligned")
    if (displayScore >= 70) return t("dashboard.bodyClock.inSync")
    if (displayScore >= 55) return t("dashboard.bodyClock.slightlyOut")
    return t("dashboard.bodyClock.outOfSync")
  }, [displayScore, noData, detail, loading, t])

  const subText =
    noData || detail == null
      ? t("dashboard.bodyClock.unlockHint")
      : t("dashboard.bodyClock.calculatedFrom")

  const coachLine =
    detail != null && !noData ? getShiftRhythmMessage(detail.total_score) : null

  const sleepComposite = detail ? computeSleepComposite(detail) : 0

  const trustWeekly = weekly?.hasRealData === true
  const bodyClockScores = trustWeekly ? (weekly?.bodyClockScores ?? []) : []
  const sleepTimingScores = trustWeekly ? (weekly?.sleepTimingScore ?? []) : []
  const hasFullWeekBodyClock = bodyClockScores.length === 7

  const lowDays = bodyClockScores.filter((s) => s < 55).length
  const mediumDays = bodyClockScores.filter((s) => s >= 55 && s < 70).length

  const patternLabel = !trustWeekly
    ? t("detail.bodyClock.patternNoWeeklySummary")
    : !hasFullWeekBodyClock
      ? t("detail.bodyClock.patternNoWeeklySummary")
      : lowDays === 0 && mediumDays <= 2
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

  const timingShort =
    !trustWeekly || sleepTimingScores.length === 0
      ? t("detail.bodyClock.timingNoData")
      : timingAvg == null
        ? t("detail.bodyClock.timingNoData")
        : timingAvg >= 75
          ? t("detail.bodyClock.timingRegular")
          : timingAvg >= 55
            ? t("detail.bodyClock.timingShifting")
            : t("detail.bodyClock.timingFlipped")

  const statusPillClass =
    loading || noData || detail == null
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : displayScore >= 70
        ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
        : displayScore >= 55
          ? "bg-amber-50 text-amber-900 ring-amber-100"
          : "bg-rose-50 text-rose-900 ring-rose-100"

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-10 pt-4 flex flex-col gap-6">
        <header className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {t("detail.bodyClock.title")}
          </h1>
        </header>

        {/* Hero — no card chrome; sits on page background */}
        <section className="flex flex-col items-center">
          <div className="pt-2 pb-4 flex flex-col items-center w-full">
            <CircadianGauge
              score={loading || noData || detail == null ? 0 : displayScore}
              centerLabel={
                loading ? "…" : noData || detail == null ? "—" : String(displayScore)
              }
            />
            <div className="mt-3 text-center space-y-2 max-w-[300px]">
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-500">
                {t("detail.bodyClock.scoreLabel")}
              </p>
              {!loading && !noData && detail ? (
                <p className="text-xs text-slate-400 font-medium">out of 100</p>
              ) : null}
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                  statusPillClass,
                )}
              >
                {headingText}
              </span>
              <p className="text-sm text-slate-600 leading-snug pt-1">{subText}</p>
            </div>
          </div>

          {coachLine ? (
            <div className="w-full max-w-[320px] pt-5 mt-1 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">
                {t("detail.bodyClock.coachLineIntro")}
              </p>
              <p className="text-sm text-slate-800 leading-snug">{coachLine}</p>
            </div>
          ) : null}
        </section>

        {/* Why this score — full breakdown from API */}
        {detail != null && !noData ? (
          <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {t("detail.bodyClock.breakdownTitle")}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              {t("detail.bodyClock.breakdownSubtitle")}
            </p>

            <div className="mt-3 divide-y divide-slate-100">
              <ScoreBarRow
                label={t("detail.bodyClock.factorSleepAmount")}
                hint={t("detail.bodyClock.hintSleepAmount")}
                value={detail.sleep_score}
              />
              <ScoreBarRow
                label={t("detail.bodyClock.factorRegularity")}
                hint={t("detail.bodyClock.hintRegularity")}
                value={detail.regularity_score}
              />
              <ScoreBarRow
                label={t("detail.bodyClock.factorShiftFit")}
                hint={t("detail.bodyClock.hintShiftFit")}
                value={detail.shift_pattern_score}
              />
              <ScoreBarRow
                label={t("detail.bodyClock.factorRecovery")}
                hint={t("detail.bodyClock.hintRecovery")}
                value={detail.recovery_score}
              />
              <div className="pt-1">
                <ScoreBarRow
                  label={t("detail.bodyClock.bundleSleep")}
                  hint={t("detail.bodyClock.hintBundleSleep")}
                  value={sleepComposite}
                />
              </div>
              <ScoreBarRow
                label={t("detail.bodyClock.factorNutrition")}
                hint={t("detail.bodyClock.hintNutrition")}
                value={detail.nutrition_score}
              />
              <ScoreBarRow
                label={t("detail.bodyClock.factorActivity")}
                hint={t("detail.bodyClock.hintActivity")}
                value={detail.activity_score}
              />
              <ScoreBarRow
                label={t("detail.bodyClock.factorMealTiming")}
                hint={t("detail.bodyClock.hintMealTiming")}
                value={detail.meal_timing_score}
                muted
              />
            </div>
          </section>
        ) : null}

        {/* Week snapshot: trend + pattern + timing in one card */}
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm px-5 py-4 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t("detail.bodyClock.weekSnapshot")}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">{t("detail.bodyClock.higherBars")}</p>
            <div className="mt-3">
              <BodyClockWeeklyStrip trustWeekly={trustWeekly} weekly={weekly} t={t} />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t("detail.bodyClock.patternVsRecovery")}
            </p>
            <p className="text-sm font-semibold text-slate-900">{patternLabel}</p>
            <p className="text-[11px] text-slate-600 leading-snug">
              {t("detail.bodyClock.patternExplanation")}
            </p>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t("detail.bodyClock.sleepTiming")}
            </p>
            <p className="text-sm text-slate-800 leading-snug">{timingShort}</p>
            <p className="text-[11px] text-slate-500 leading-snug">
              {t("detail.bodyClock.timingTip")}
            </p>
          </div>
        </section>

        {/* Compact habits */}
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            {t("detail.bodyClock.quickHabits")}
          </h2>
          <ul className="text-sm text-slate-600 space-y-2.5 leading-snug">
            <li className="flex gap-2">
              <span className="text-slate-300 shrink-0">•</span>
              <span>{t("detail.bodyClock.lightDay")}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-300 shrink-0">•</span>
              <span>{t("detail.bodyClock.lightNight")}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-300 shrink-0">•</span>
              <span>{t("detail.bodyClock.lightEvening")}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-300 shrink-0">•</span>
              <span>{t("detail.bodyClock.tipRiskShort")}</span>
            </li>
          </ul>
        </section>

        <footer className="pt-2 flex flex-col items-center gap-1 text-center">
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-400">
            ShiftCoach
          </span>
          <p className="text-[10px] text-slate-400 max-w-[280px] leading-relaxed">
            {t("detail.common.disclaimer")}
          </p>
        </footer>
      </div>
    </main>
  )
}

function BodyClockWeeklyStrip({
  weekly,
  trustWeekly,
  t,
}: {
  weekly: ReturnType<typeof useWeeklyProgress>
  trustWeekly: boolean
  t: (key: string) => string
}) {
  const days = trustWeekly ? (weekly?.days ?? []) : []
  const scores = trustWeekly ? (weekly?.bodyClockScores ?? []) : []

  if (!trustWeekly || !days.length || !scores.length) {
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
      <div className="flex items-end justify-between gap-2 min-h-[52px]">
        {days.map((label, idx) => {
          const score = scores[idx] ?? 0
          const heightPct = Math.max(10, Math.round((score / maxScore) * 100))
          const toneClass =
            score >= 70 ? "bg-emerald-400" : score >= 55 ? "bg-amber-400" : "bg-rose-400"
          const isToday = label === todayLabel
          return (
            <div key={`${label}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn("w-2 rounded-full", toneClass)}
                style={{ height: `${heightPct}%`, minHeight: "14px" }}
              />
              <span
                className={cn(
                  "text-[9px] uppercase tracking-[0.12em]",
                  isToday ? "text-slate-900 font-semibold" : "text-slate-500",
                )}
              >
                {label.charAt(0)}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-slate-600 leading-snug">{warning}</p>
    </div>
  )
}

function CircadianGauge({ score, centerLabel }: { score: number; centerLabel: string }) {
  const size = 176
  const radius = 80
  const stroke = 8
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const capped = Math.min(Math.max(score, 0), 100)
  const offset = circumference * (1 - capped / 100)

  return (
    <div className="relative flex h-44 w-44 items-center justify-center">
      <svg height={size} width={size} viewBox={`0 0 ${size} ${size}`} className="block">
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={normalizedRadius}
          fill="white"
          stroke="url(#bodyClockTrackGradient)"
          strokeWidth={stroke}
        />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-3xl font-semibold text-slate-900 tabular-nums leading-none">
          {centerLabel}
        </p>
      </div>
    </div>
  )
}
