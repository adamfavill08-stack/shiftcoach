"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Inter } from "next/font/google"
import { ChevronLeft } from "lucide-react"
import { useWeeklyProgress } from "@/lib/hooks/useWeeklyProgress"
import {
  computeSleepComposite,
  shiftRhythmTotalToGauge100,
} from "@/lib/shift-rhythm/shiftRhythmDisplay"
import { getShiftRhythmMessage, type ShiftRhythmScores } from "@/lib/shift-rhythm/engine"
import { useTranslation } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import { useCircadianState } from "@/components/providers/circadian-state-provider"
import { useShiftState } from "@/components/providers/shift-state-provider"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import {
  buildCircadianHabitBullets,
  buildCircadianScoreFactorRows,
  buildForecastRecoveryLine,
  buildTodaysTakeaway,
  buildTransitionForecastNote,
} from "@/lib/body-clock/bodyClockCircadianUi"

const inter = Inter({ subsets: ["latin"] })

/** Matches dashboard primary cards (e.g. ShiftRhythm / adjusted-calories links). */
const dashboardCardClassName =
  "rounded-3xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]"

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
    <div className={`space-y-1.5 py-3 border-b border-[var(--border-subtle)] last:border-0 ${inter.className}`}>
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-sm font-medium text-[var(--text-soft)]">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-[var(--text-main)] shrink-0">{v}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--ring-bg)] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            muted ? "bg-slate-400/50 dark:bg-slate-600/60" : "bg-gradient-to-r from-sky-500 to-indigo-500",
          )}
          style={{ width: `${v}%` }}
        />
      </div>
      <p className="text-[11px] text-[var(--text-muted)] leading-snug">{hint}</p>
    </div>
  )
}

export default function BodyClockPage() {
  const { t } = useTranslation()
  const { circadianState, isLoading: circadianAgentLoading } = useCircadianState()
  const { userShiftState } = useShiftState()
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

  const legacyGaugeScore = useMemo(
    () => shiftRhythmTotalToGauge100(detail?.total_score ?? null),
    [detail?.total_score],
  )

  const displayScore =
    circadianState != null ? circadianState.score : legacyGaugeScore

  const noData = hasRhythmData === false || (!loading && detail == null)

  const headingText = useMemo(() => {
    if (circadianState != null) return circadianState.status
    if (loading) return t("detail.bodyClock.loading")
    if (noData || detail == null) return t("dashboard.bodyClock.comingSoon")
    if (legacyGaugeScore >= 80) return t("dashboard.bodyClock.stronglyAligned")
    if (legacyGaugeScore >= 70) return t("dashboard.bodyClock.inSync")
    if (legacyGaugeScore >= 55) return t("dashboard.bodyClock.slightlyOut")
    return t("dashboard.bodyClock.outOfSync")
  }, [circadianState, loading, noData, detail, legacyGaugeScore, t])

  const subText =
    circadianState != null
      ? "Based on your recent sleep logs (14-day window), shift context, the 03:00 timing anchor, and how your average sleep length compares to your sleep goal."
      : noData || detail == null
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

  const todaysTakeaway = useMemo(
    () => (circadianState != null ? buildTodaysTakeaway(circadianState) : null),
    [circadianState],
  )

  const transitionForecastNote = useMemo(
    () => buildTransitionForecastNote(userShiftState),
    [userShiftState],
  )

  const circadianHabits = useMemo(
    () => (circadianState != null ? buildCircadianHabitBullets(circadianState) : null),
    [circadianState],
  )

  const forecastRecoveryLine = useMemo(
    () => (circadianState != null ? buildForecastRecoveryLine(circadianState.forecast) : null),
    [circadianState],
  )

  const scoreFactorRows = useMemo(
    () => (circadianState != null ? buildCircadianScoreFactorRows(circadianState) : null),
    [circadianState],
  )

  const statusPillClass =
    circadianState != null
      ? circadianState.score >= 75
        ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
        : circadianState.score >= 55
          ? "bg-amber-50 text-amber-900 ring-amber-100"
          : "bg-rose-50 text-rose-900 ring-rose-100"
      : loading || noData || detail == null
        ? "bg-slate-100 text-slate-700 ring-slate-200"
        : legacyGaugeScore >= 70
          ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
          : legacyGaugeScore >= 55
            ? "bg-amber-50 text-amber-900 ring-amber-100"
            : "bg-rose-50 text-rose-900 ring-rose-100"

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-10 pt-4 flex flex-col gap-6">
        <header className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full border border-[var(--border-subtle)] bg-[var(--card)] text-[var(--text-soft)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className={`text-xl font-semibold tracking-tight text-[var(--text-main)] ${inter.className}`}>
            {t("detail.bodyClock.title")}
          </h1>
        </header>

        {/* Hero — gauge + stacked cards share the same vertical rhythm as the rest of the page */}
        <section className="flex w-full flex-col items-center gap-6">
          <div className="flex w-full flex-col items-center gap-3">
            <CircadianGauge
              score={
                circadianState != null
                  ? circadianState.score
                  : loading || noData || detail == null
                    ? 0
                    : displayScore
              }
              trend={circadianState?.trend ?? null}
              centerLabel={
                circadianAgentLoading && !circadianState
                  ? "…"
                  : circadianState
                    ? String(Math.round(circadianState.score))
                    : loading
                      ? "…"
                      : noData || detail == null
                        ? "—"
                        : String(Math.round(legacyGaugeScore))
              }
            />
            <div className={`text-center space-y-2 max-w-[300px] ${inter.className}`}>
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[var(--text-muted)]">
                {t("detail.bodyClock.scoreLabel")}
              </p>
              {circadianState != null || (!loading && !noData && detail) ? (
                <p className="text-xs text-[var(--text-muted)] font-medium">out of 100</p>
              ) : null}
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                  statusPillClass,
                )}
              >
                {headingText}
              </span>
              <p className="text-sm text-[var(--text-soft)] leading-snug pt-1">{subText}</p>
            </div>
          </div>

          {circadianState ? (
            <section className={cn("w-full text-left", dashboardCardClassName)}>
              <h2 className={`text-sm font-semibold text-[var(--text-main)] ${inter.className}`}>
                Today&apos;s takeaway
              </h2>
              <p className={`mt-2 text-sm leading-relaxed text-[var(--text-soft)] ${inter.className}`}>
                {todaysTakeaway}
              </p>
            </section>
          ) : coachLine ? (
            <section className={cn("w-full text-left", dashboardCardClassName)}>
              <h2 className={`text-sm font-semibold text-[var(--text-main)] ${inter.className}`}>
                {t("detail.bodyClock.coachLineIntro")}
              </h2>
              <p className={`mt-2 text-sm leading-relaxed text-[var(--text-soft)] ${inter.className}`}>
                {coachLine}
              </p>
            </section>
          ) : null}

          {circadianState && scoreFactorRows && scoreFactorRows.length > 0 ? (
            <section className={cn("w-full text-left", dashboardCardClassName)}>
              <h2 className={`text-sm font-semibold text-[var(--text-main)] ${inter.className}`}>
                Score factors
              </h2>
              <ul className={`mt-3 space-y-2 text-sm text-[var(--text-soft)] leading-snug ${inter.className}`}>
                {scoreFactorRows.map((r) => (
                  <li key={r.key} className="leading-snug">
                    {r.line}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {circadianState ? (
            <section className={cn("w-full text-left", dashboardCardClassName)}>
              <h2 className={`text-sm font-semibold text-[var(--text-main)] ${inter.className}`}>
                Circadian forecast
              </h2>
              <p className={`mt-3 text-sm font-medium text-[var(--text-soft)] leading-snug ${inter.className}`}>
                Peak alertness — {circadianState.peakAlertnessTime}
              </p>
              <p className={`mt-2 text-sm text-[var(--text-soft)] leading-snug ${inter.className}`}>
                Low energy — {circadianState.lowEnergyTime}
              </p>
            </section>
          ) : null}

          {circadianState ? (
            <section className={cn("w-full text-left", dashboardCardClassName)}>
              <h2 className={`text-sm font-semibold text-[var(--text-main)] ${inter.className}`}>
                Score forecast
              </h2>
              <p className={`text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed ${inter.className}`}>
                Projected circadian alignment if your recent sleep pattern continues (model estimate).
              </p>
              <ul className={`mt-3 space-y-2 text-sm text-[var(--text-main)] ${inter.className}`}>
                <li className="flex justify-between gap-3">
                  <span className="text-[var(--text-soft)]">Tomorrow</span>
                  <span className="font-semibold tabular-nums">
                    ~{Math.round(Math.min(100, Math.max(0, circadianState.forecast.tomorrow)))}
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="text-[var(--text-soft)]">In 3 days</span>
                  <span className="font-semibold tabular-nums">
                    ~{Math.round(Math.min(100, Math.max(0, circadianState.forecast.threeDays)))}
                  </span>
                </li>
              </ul>
              <p className={`mt-4 text-sm leading-snug text-[var(--text-soft)] ${inter.className}`}>
                {forecastRecoveryLine}
              </p>
              {transitionForecastNote ? (
                <p
                  className={`mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-snug dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900/50 ${inter.className}`}
                >
                  {transitionForecastNote}
                </p>
              ) : null}
            </section>
          ) : (
            <section
              className={cn(
                "w-full rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--card-subtle)] px-5 py-4 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
              )}
            >
              <h2 className={`text-sm font-semibold text-[var(--text-main)] ${inter.className}`}>
                Score forecast
              </h2>
              <p className={`text-xs text-[var(--text-muted)] mt-2 leading-relaxed ${inter.className}`}>
                {circadianAgentLoading
                  ? "Loading circadian projections…"
                  : "Forecast appears once your circadian score is calculated."}
              </p>
            </section>
          )}
        </section>

        {/* Why this score — full breakdown from API */}
        {detail != null && !noData ? (
          <section className={dashboardCardClassName}>
            <h2 className={`text-sm font-semibold text-[var(--text-main)] ${inter.className}`}>
              {t("detail.bodyClock.breakdownTitle")}
            </h2>
            <p className={`text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed ${inter.className}`}>
              {t("detail.bodyClock.breakdownSubtitle")}
            </p>

            <div className="mt-3">
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
        <section className={cn(dashboardCardClassName, "space-y-5")}>
          <div>
            <h2 className={`text-sm font-semibold text-[var(--text-main)] ${inter.className}`}>
              {t("detail.bodyClock.weekSnapshot")}
            </h2>
            <p className={`text-[11px] text-[var(--text-muted)] mt-1 ${inter.className}`}>
              {t("detail.bodyClock.higherBars")}
            </p>
            <div className="mt-3">
              <BodyClockWeeklyStrip trustWeekly={trustWeekly} weekly={weekly} t={t} />
            </div>
          </div>
          <div className={`border-t border-[var(--border-subtle)] pt-4 space-y-2 ${inter.className}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t("detail.bodyClock.patternVsRecovery")}
            </p>
            <p className="text-sm font-semibold text-[var(--text-main)]">{patternLabel}</p>
            <p className="text-[11px] text-[var(--text-soft)] leading-snug">
              {t("detail.bodyClock.patternExplanation")}
            </p>
          </div>
          <div className={`border-t border-[var(--border-subtle)] pt-4 space-y-2 ${inter.className}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t("detail.bodyClock.sleepTiming")}
            </p>
            <p className="text-sm text-[var(--text-main)] leading-snug">{timingShort}</p>
            <p className="text-[11px] text-[var(--text-muted)] leading-snug">
              {t("detail.bodyClock.timingTip")}
            </p>
          </div>
        </section>

        {/* Circadian-specific habits */}
        <section className={dashboardCardClassName}>
          <h2 className={`text-sm font-semibold text-[var(--text-main)] mb-1 ${inter.className}`}>
            {t("detail.bodyClock.quickHabits")}
          </h2>
          {circadianHabits && circadianHabits.length > 0 ? (
            <>
              <p className={`text-[11px] text-[var(--text-muted)] mb-3 leading-relaxed ${inter.className}`}>
                Tailored to your current sleep midpoint and pattern.
              </p>
              <ul className={`text-sm text-[var(--text-soft)] space-y-2.5 leading-snug ${inter.className}`}>
                {circadianHabits.map((line, idx) => (
                  <li key={`${idx}-${line.slice(0, 24)}`} className="flex gap-2">
                    <span className="text-[var(--text-muted)] shrink-0">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={`text-sm text-[var(--text-muted)] mt-2 leading-relaxed ${inter.className}`}>
              Personalised habits appear once your circadian score is ready (sleep logs + profile).
            </p>
          )}
        </section>

        <footer className="pt-2 flex flex-col items-center gap-1 text-center">
          <span
            className={`text-[10px] font-semibold tracking-[0.2em] uppercase text-[var(--text-muted)] ${inter.className}`}
          >
            ShiftCoach
          </span>
          <p className={`text-[10px] text-[var(--text-muted)] max-w-[280px] leading-relaxed ${inter.className}`}>
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
      <p className={`text-[11px] text-[var(--text-muted)] ${inter.className}`}>
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
                  `text-[9px] uppercase tracking-[0.12em] ${inter.className}`,
                  isToday ? "text-[var(--text-main)] font-semibold" : "text-[var(--text-muted)]",
                )}
              >
                {label.charAt(0)}
              </span>
            </div>
          )
        })}
      </div>
      <p className={`text-[11px] text-[var(--text-soft)] leading-snug ${inter.className}`}>{warning}</p>
    </div>
  )
}

/** Same ring as dashboard circadian gauge (shift-rhythm card), without the body artwork. */
function CircadianGauge({
  score,
  centerLabel,
  trend,
}: {
  score: number
  centerLabel: string
  trend?: "improving" | "stable" | "declining" | null
}) {
  const ringPx = 176
  const stroke = 15
  const normalizedRadius = 76
  const vb = 200
  const cx = vb / 2
  const cy = vb / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const capped = Math.min(Math.max(score, 0), 100)
  const offset = circumference * (1 - capped / 100)
  const showNumeric = centerLabel !== "…" && centerLabel !== "—"

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const syncTheme = () => setIsDark(root.classList.contains("dark"))
    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const alignmentStroke =
    capped >= 80 ? "#22c55e" : capped >= 65 ? "#f59e0b" : "#ef4444"
  const progress = capped / 100
  const roundTipDeg =
    capped > 0 && capped < 100
      ? ((stroke / 2) / normalizedRadius) * (180 / Math.PI)
      : 0
  const markerRotateDeg = progress * 360 + roundTipDeg
  const nightDash = circumference * 0.22
  const dayDash = circumference - nightDash
  const nightOffset = circumference * 0.18
  const trackStart = isDark ? "#3a3a40" : "#E7E5E4"
  const trackEnd = isDark ? "#2c2c31" : "#D6D3D1"
  const centerFill = isDark ? "rgba(23,23,27,0.42)" : "rgba(255,255,255,0.38)"
  const centerText = isDark ? "#f3f4f6" : "#0f172a"
  const centerHalo = isDark
    ? "pointer-events-none absolute h-[7.25rem] w-[7.25rem] rounded-full border border-white/10 bg-black/20 blur-[2px]"
    : "pointer-events-none absolute h-[7.25rem] w-[7.25rem] rounded-full border border-white/50 bg-white/25 blur-[1px]"

  return (
    <div className="relative shrink-0" style={{ width: ringPx, height: ringPx }}>
      <svg width={ringPx} height={ringPx} viewBox={`0 0 ${vb} ${vb}`} className="block" aria-hidden>
        <defs>
          <linearGradient id="bodyClockHeroTrack" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={trackStart} />
            <stop offset="100%" stopColor={trackEnd} />
          </linearGradient>
          <radialGradient id="bodyClockHeroInnerDial" cx="38%" cy="32%" r="72%">
            <stop
              offset="0%"
              stopColor={isDark ? "rgba(60,60,68,0.65)" : "rgba(255,255,255,0.75)"}
            />
            <stop offset="100%" stopColor={centerFill} />
          </radialGradient>
          <filter id="bodyClockHeroActiveGlow" x="-22%" y="-22%" width="144%" height="144%">
            <feGaussianBlur stdDeviation="1.6" result="blur">
              <animate
                attributeName="stdDeviation"
                values="1.45;1.85;1.45"
                dur="7s"
                repeatCount="indefinite"
              />
            </feGaussianBlur>
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 0.28 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bodyClockHeroScoreMarker" x="-120%" y="-120%" width="340%" height="340%">
            <feDropShadow
              dx="0"
              dy="1.1"
              stdDeviation="1.2"
              floodColor={isDark ? "#000000" : "#0f172a"}
              floodOpacity={isDark ? "0.5" : "0.22"}
            />
          </filter>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={normalizedRadius}
          fill="url(#bodyClockHeroInnerDial)"
          stroke="url(#bodyClockHeroTrack)"
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={normalizedRadius}
          fill="none"
          stroke="#3b82f6"
          strokeOpacity={0.45}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${nightDash} ${dayDash}`}
          strokeDashoffset={-nightOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={normalizedRadius}
          fill="none"
          stroke={alignmentStroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          filter="url(#bodyClockHeroActiveGlow)"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <circle
          cx={cx + normalizedRadius}
          cy={cy}
          r={7.5}
          fill={alignmentStroke}
          stroke="white"
          strokeWidth={2.35}
          transform={`rotate(${-90 + markerRotateDeg} ${cx} ${cy})`}
          filter="url(#bodyClockHeroScoreMarker)"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={centerHalo} aria-hidden />
        <div className="relative z-[1] flex items-center justify-center gap-1">
          <p
            className={`text-[2.125rem] font-semibold tabular-nums leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)] ${inter.className}`}
            style={{ color: centerText }}
          >
            {showNumeric ? Math.round(capped) : centerLabel}
          </p>
          {showNumeric && trend === "improving" ? (
            <ArrowUp
              className="h-[1.35rem] w-[1.35rem] shrink-0 text-emerald-500 drop-shadow-sm"
              strokeWidth={2.5}
              aria-hidden
            />
          ) : showNumeric && trend === "declining" ? (
            <ArrowDown
              className="h-[1.35rem] w-[1.35rem] shrink-0 text-rose-500 drop-shadow-sm"
              strokeWidth={2.5}
              aria-hidden
            />
          ) : showNumeric && trend === "stable" ? (
            <Minus
              className="h-5 w-5 shrink-0 text-slate-400 drop-shadow-sm"
              strokeWidth={2.5}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
