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
import type { ShiftRhythmScores } from "@/lib/shift-rhythm/engine"
import { useTranslation } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import { useCircadianState } from "@/components/providers/circadian-state-provider"
import { useShiftState } from "@/components/providers/shift-state-provider"
import {
  buildForecastRecoveryLine,
  buildTransitionForecastNote,
} from "@/lib/body-clock/bodyClockCircadianUi"
import {
  BodyClockScoreCard,
  type BodyClockScoreDay,
} from "@/components/body-clock/BodyClockScoreCard"
import { BodyClockMetricStrip } from "@/components/body-clock/BodyClockMetricStrip"
import { BodyClockScoreForecastCard } from "@/components/body-clock/BodyClockScoreForecastCard"
import {
  BodyClockBreakdownCard,
  type BodyClockBreakdownRow,
} from "@/components/body-clock/BodyClockBreakdownCard"
import { BodyClockSimpleHabitsCard } from "@/components/body-clock/BodyClockSimpleHabitsCard"

const inter = Inter({ subsets: ["latin"] })

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

  const sleepComposite = detail ? computeSleepComposite(detail) : 0

  const breakdownRows = useMemo((): BodyClockBreakdownRow[] => {
    if (detail == null) return []
    return [
      {
        id: "sleep_amount",
        label: t("detail.bodyClock.factorSleepAmount"),
        value: detail.sleep_score,
        group: "sleepRhythm",
        fill: "green",
      },
      {
        id: "regularity",
        label: t("detail.bodyClock.factorRegularity"),
        value: detail.regularity_score,
        group: "sleepRhythm",
        fill: "cyan",
      },
      {
        id: "shift_fit",
        label: t("detail.bodyClock.factorShiftFit"),
        value: detail.shift_pattern_score,
        group: "sleepRhythm",
        fill: "cyan",
      },
      {
        id: "recovery",
        label: t("detail.bodyClock.factorRecovery"),
        value: detail.recovery_score,
        group: "sleepRhythm",
        fill: "green",
      },
      {
        id: "bundle_sleep",
        label: t("detail.bodyClock.bundleSleep"),
        value: sleepComposite,
        group: "sleepRhythm",
        fill: "green",
      },
      {
        id: "nutrition",
        label: t("detail.bodyClock.factorNutrition"),
        value: detail.nutrition_score,
        group: "day",
        fill: "amber",
      },
      {
        id: "activity",
        label: t("detail.bodyClock.factorActivity"),
        value: detail.activity_score,
        group: "day",
        fill: "sky",
      },
      {
        id: "meal_timing",
        label: t("detail.bodyClock.factorMealTiming"),
        value: detail.meal_timing_score,
        group: "day",
        fill: "slate",
        barMuted: true,
      },
    ]
  }, [detail, sleepComposite, t])

  const trustWeekly = weekly?.hasRealData === true

  const transitionForecastNote = useMemo(
    () => buildTransitionForecastNote(userShiftState),
    [userShiftState],
  )

  const forecastRecoveryLine = useMemo(
    () => (circadianState != null ? buildForecastRecoveryLine(circadianState.forecast) : null),
    [circadianState],
  )

  const scoreForecastTomorrowDelta = useMemo(() => {
    if (circadianState == null) return { label: null as string | null, tone: null as "down" | "up" | null }
    const today = Math.round(Math.min(100, Math.max(0, circadianState.score)))
    const tomorrow = Math.round(Math.min(100, Math.max(0, circadianState.forecast.tomorrow)))
    const d = today - tomorrow
    if (d === 0) return { label: null, tone: null }
    if (d > 0) return { label: t("detail.bodyClock.forecastPtsDown", { n: d }), tone: "down" as const }
    return { label: t("detail.bodyClock.forecastPtsUp", { n: Math.abs(d) }), tone: "up" as const }
  }, [circadianState, t])

  const chartDays = useMemo((): BodyClockScoreDay[] => {
    if (!trustWeekly) return []
    const dayLabels = weekly?.days ?? []
    const scores = weekly?.bodyClockScores ?? []
    if (!dayLabels.length || !scores.length) return []
    const todayShort = new Date().toLocaleDateString("en-GB", { weekday: "short" })
    return dayLabels.map((label, idx) => ({
      day: label,
      score: Math.min(100, Math.max(0, Math.round(scores[idx] ?? 0))),
      isToday: label === todayShort,
    }))
  }, [trustWeekly, weekly?.days, weekly?.bodyClockScores])

  const chartReady = chartDays.length === 7

  const { weekAvg, weekBest, dayOverDayTrend } = useMemo(() => {
    if (!chartReady || chartDays.length === 0) {
      return { weekAvg: null as number | null, weekBest: null as number | null, dayOverDayTrend: null as number | null }
    }
    const scores = chartDays.map((d) => d.score)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const best = Math.max(...scores)
    const todayIdx = chartDays.findIndex((d) => d.isToday)
    let trend: number | null = null
    if (todayIdx >= 0 && chartDays.length >= 2) {
      const prevIdx = todayIdx === 0 ? chartDays.length - 1 : todayIdx - 1
      trend = chartDays[todayIdx]!.score - chartDays[prevIdx]!.score
    }
    return { weekAvg: avg, weekBest: best, dayOverDayTrend: trend }
  }, [chartDays, chartReady])

  const heroScorePresentation = useMemo(() => {
    if (circadianAgentLoading && !circadianState) return { loading: true as const, value: null as number | null }
    if (circadianState != null) return { loading: false as const, value: Math.round(circadianState.score) }
    if (loading) return { loading: true as const, value: null as number | null }
    if (noData || detail == null) return { loading: false as const, value: null as number | null }
    return { loading: false as const, value: Math.round(legacyGaugeScore) }
  }, [
    circadianAgentLoading,
    circadianState,
    loading,
    noData,
    detail,
    legacyGaugeScore,
  ])

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

        {/* Hero — weekly score card + stacked cards */}
        <section className="flex w-full flex-col items-center gap-6">
          <div className="flex w-full flex-col items-stretch gap-3">
            <BodyClockScoreCard
              days={chartDays}
              chartReady={chartReady}
              todayScore={heroScorePresentation.value}
              isLoadingScore={heroScorePresentation.loading}
              badgeLabel={headingText}
              badgeClassName={statusPillClass}
              avg={weekAvg}
              best={weekBest}
              trend={dayOverDayTrend}
              scoreTitle={t("detail.bodyClock.scoreLabel")}
              todaySuffix={t("detail.bodyClock.todaySuffix")}
              labelSevenDayAvg={t("detail.bodyClock.statSevenDayAvg")}
              labelBestDay={t("detail.bodyClock.statBestDay")}
              labelTrend={t("detail.bodyClock.statTrend")}
              waitingLabel={t("detail.bodyClock.waitingData")}
            />
            {circadianState != null || (circadianAgentLoading && !circadianState) ? (
              <BodyClockMetricStrip
                peakTime={circadianState?.peakAlertnessTime ?? null}
                lowEnergyTime={circadianState?.lowEnergyTime ?? null}
                midpointOffsetHours={
                  circadianState != null ? circadianState.sleepMidpointOffset : null
                }
                isLoading={circadianAgentLoading && !circadianState}
                labelPeak={t("detail.bodyClock.metricPeak")}
                labelLow={t("detail.bodyClock.metricLow")}
                labelMidpoint={t("detail.bodyClock.metricMidpoint")}
              />
            ) : null}
          </div>

          {circadianState ? (
            <BodyClockScoreForecastCard
              todayScore={circadianState.score}
              tomorrowRaw={circadianState.forecast.tomorrow}
              threeDaysRaw={circadianState.forecast.threeDays}
              heading={t("detail.bodyClock.scoreForecastHeading")}
              labelToday={t("detail.bodyClock.forecastLabelToday")}
              labelTomorrow={t("detail.bodyClock.forecastLabelTomorrow")}
              labelPlusThree={t("detail.bodyClock.forecastLabelPlusThree")}
              tomorrowDeltaLabel={scoreForecastTomorrowDelta.label}
              tomorrowDeltaTone={scoreForecastTomorrowDelta.tone}
              bannerText={transitionForecastNote ?? forecastRecoveryLine ?? null}
            />
          ) : (
            <section
              className={cn(
                "w-full rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--card-subtle)] px-5 py-4 text-left shadow-none",
              )}
            >
              <h2
                className={`text-[11px] font-bold uppercase tracking-[0.14em] text-[#A0A0A0] dark:text-neutral-500 ${inter.className}`}
              >
                {t("detail.bodyClock.scoreForecastHeading")}
              </h2>
              <p className={`text-xs text-[var(--text-muted)] mt-3 leading-relaxed ${inter.className}`}>
                {circadianAgentLoading
                  ? "Loading circadian projections…"
                  : "Forecast appears once your circadian score is calculated."}
              </p>
            </section>
          )}
        </section>

        {/* Why this score — full breakdown from API */}
        {detail != null && !noData ? (
          <BodyClockBreakdownCard
            title={t("detail.bodyClock.breakdownTitle")}
            rows={breakdownRows}
            expandLabel={t("detail.bodyClock.breakdownFilterAll")}
            collapseLabel={t("detail.bodyClock.breakdownShowLess")}
            toggleAriaLabel={t("detail.bodyClock.breakdownToggleAria")}
          />
        ) : null}

        <BodyClockSimpleHabitsCard
          title={t("detail.bodyClock.quickHabits")}
          labels={{
            sunrise: t("detail.bodyClock.habitTileSleepMidpoint"),
            anchor: t("detail.bodyClock.habitTileAnchorMeal"),
            sun: t("detail.bodyClock.habitTileLightWaking"),
            coffee: t("detail.bodyClock.habitTileCaffeine"),
          }}
        />

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
