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
import { addUtcCalendarDays, utcTodayYmd } from "@/lib/date/utcCalendar"
import { authedFetch } from "@/lib/supabase/authedFetch"
import { cn } from "@/lib/utils"
import { useCircadianState } from "@/components/providers/circadian-state-provider"
import { useShiftState } from "@/components/providers/shift-state-provider"
import {
  BodyClockScoreCard,
  type BodyClockScoreDay,
} from "@/components/body-clock/BodyClockScoreCard"
import { BodyClockMetricStrip } from "@/components/body-clock/BodyClockMetricStrip"
import {
  BodyClockBreakdownCard,
  type BodyClockBreakdownRow,
} from "@/components/body-clock/BodyClockBreakdownCard"
import { BodyClockSimpleHabitsCard } from "@/components/body-clock/BodyClockSimpleHabitsCard"
import { BodyClockMotivationCard } from "@/components/body-clock/BodyClockMotivationCard"
import CircadianCard from "@/components/circadian/CircadianCard"

const inter = Inter({ subsets: ["latin"] })

type ShiftRhythmResponse = {
  score?: Partial<ShiftRhythmScores> & { total_score?: number }
  yesterdayScore?: number | null
  dailyScores?: Array<{ date?: string; total_score?: number | null }>
  hasRhythmData?: boolean
  socialJetlag?: {
    currentMisalignmentHours?: number
    weeklyAverageMisalignmentHours?: number
    category?: "low" | "moderate" | "high"
    explanation?: string
  } | null
  sleepDeficit?: {
    weeklyDeficit?: number
    category?: "surplus" | "low" | "medium" | "high"
    daily?: Array<{ actual?: number }>
  } | null
  fatigueRisk?: {
    score?: number
    level?: "low" | "moderate" | "high"
    explanation?: string
    confidenceLabel?: "low" | "medium" | "high"
  } | null
  bingeRisk?: {
    score?: number
    level?: "low" | "medium" | "high"
    explanation?: string
  } | null
}

type NutritionTodayResponse = {
  nutrition?: {
    hydrationTargets?: {
      water_ml?: number
      caffeine_mg?: number
    }
    hydrationIntake?: {
      water_ml?: number
      caffeine_mg?: number
    }
  }
}

type ActivityTodayResponse = {
  activity?: {
    steps?: number
    activeMinutes?: number
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
  const clamped = Math.min(Math.max(value, inMin), inMax)
  const ratio = (clamped - inMin) / (inMax - inMin || 1)
  return outMin + ratio * (outMax - outMin)
}

function parseScore(json: ShiftRhythmResponse): ShiftRhythmScores | null {
  const s = json?.score
  if (!s || typeof s.total_score !== "number") return null
  const n = (v: unknown, d = 0) => (typeof v === "number" && !Number.isNaN(v) ? v : d)
  const regularity =
    s.regularity_score === null || s.regularity_score === undefined
      ? null
      : typeof s.regularity_score === "number" && !Number.isNaN(s.regularity_score)
        ? s.regularity_score
        : null
  return {
    sleep_score: n(s.sleep_score),
    regularity_score: regularity,
    shift_pattern_score: n(s.shift_pattern_score),
    recovery_score:
      typeof s.recovery_score === "number" && !Number.isNaN(s.recovery_score)
        ? s.recovery_score
        : null,
    nutrition_score: n(s.nutrition_score),
    activity_score: n(s.activity_score),
    movement_score:
      typeof s.movement_score === "number" && !Number.isNaN(s.movement_score)
        ? s.movement_score
        : null,
    meal_timing_score: n(s.meal_timing_score),
    sleep_composite:
      typeof s.sleep_composite === "number" && !Number.isNaN(s.sleep_composite)
        ? s.sleep_composite
        : null,
    circadian_debt:
      typeof s.circadian_debt === "number" && !Number.isNaN(s.circadian_debt)
        ? s.circadian_debt
        : 0,
    circadian_debt_trend:
      s.circadian_debt_trend === "improving" || s.circadian_debt_trend === "worsening" || s.circadian_debt_trend === "stable"
        ? s.circadian_debt_trend
        : "stable",
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
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [socialJetlag, setSocialJetlag] = useState<ShiftRhythmResponse["socialJetlag"]>(null)
  const [sleepDeficit, setSleepDeficit] = useState<ShiftRhythmResponse["sleepDeficit"]>(null)
  const [fatigueRisk, setFatigueRisk] = useState<ShiftRhythmResponse["fatigueRisk"]>(null)
  const [bingeRisk, setBingeRisk] = useState<ShiftRhythmResponse["bingeRisk"]>(null)
  const [yesterdayScore, setYesterdayScore] = useState<number | null>(null)
  const [dailyScores, setDailyScores] = useState<Array<{ date: string; total_score: number | null }>>([])
  const [hydrationScore, setHydrationScore] = useState<number | null>(null)
  const [isActivityEstimated, setIsActivityEstimated] = useState(false)
  const weekly = useWeeklyProgress()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authedFetch("/api/profile", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const j = (await res.json().catch(() => ({}))) as { profile?: { name?: string | null } }
        const raw = j?.profile?.name
        if (typeof raw === "string" && raw.trim()) {
          const first = raw.trim().split(/\s+/)[0]
          if (first && !cancelled) setDisplayName(first)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await authedFetch("/api/shift-rhythm", { cache: "no-store" })
        if (!res.ok) {
          if (!cancelled) {
            setDetail(null)
            setHasRhythmData(false)
            setSocialJetlag(null)
            setSleepDeficit(null)
            setFatigueRisk(null)
            setBingeRisk(null)
            setYesterdayScore(null)
            setDailyScores([])
          }
          return
        }
        const json = (await res.json().catch(() => ({}))) as ShiftRhythmResponse
        if (!cancelled) {
          setHasRhythmData(json?.hasRhythmData)
          setDetail(parseScore(json))
          setSocialJetlag(json?.socialJetlag ?? null)
          setSleepDeficit(json?.sleepDeficit ?? null)
          setFatigueRisk(json?.fatigueRisk ?? null)
          setBingeRisk(json?.bingeRisk ?? null)
          setYesterdayScore(
            typeof json?.yesterdayScore === "number" && Number.isFinite(json.yesterdayScore)
              ? json.yesterdayScore
              : null,
          )
          setDailyScores(
            Array.isArray(json?.dailyScores)
              ? json.dailyScores
                  .map((r) => ({
                    date: typeof r?.date === "string" ? r.date.slice(0, 10) : "",
                    total_score:
                      typeof r?.total_score === "number" && Number.isFinite(r.total_score)
                        ? r.total_score
                        : null,
                  }))
                  .filter((r) => r.date.length > 0)
              : [],
          )
        }

        // Non-critical enrichments: fetch in background so core page content paints first.
        ;(async () => {
          const [nutritionRes, activityRes] = await Promise.all([
            authedFetch("/api/nutrition/today", { cache: "no-store" }).catch(() => null),
            authedFetch("/api/activity/today", { cache: "no-store" }).catch(() => null),
          ])
          const [nutritionJson, activityJson] = await Promise.all([
            nutritionRes?.ok
              ? ((nutritionRes.json().catch(() => ({}))) as Promise<NutritionTodayResponse>)
              : Promise.resolve(null),
            activityRes?.ok
              ? ((activityRes.json().catch(() => ({}))) as Promise<ActivityTodayResponse>)
              : Promise.resolve(null),
          ])
          if (cancelled) return
          const waterTarget = nutritionJson?.nutrition?.hydrationTargets?.water_ml
          const waterConsumed = nutritionJson?.nutrition?.hydrationIntake?.water_ml
          const caffeineLimit = nutritionJson?.nutrition?.hydrationTargets?.caffeine_mg
          const caffeineConsumed = nutritionJson?.nutrition?.hydrationIntake?.caffeine_mg
          if (
            typeof waterTarget === "number" &&
            Number.isFinite(waterTarget) &&
            waterTarget > 0 &&
            typeof waterConsumed === "number" &&
            Number.isFinite(waterConsumed)
          ) {
            const hydrated = mapRange(waterConsumed / waterTarget, 0.6, 1.0, 55, 100)
            const caffeineScore =
              typeof caffeineLimit === "number" && Number.isFinite(caffeineLimit) && caffeineLimit > 0 && typeof caffeineConsumed === "number" && Number.isFinite(caffeineConsumed)
                ? mapRange(caffeineConsumed / caffeineLimit, 0.2, 1.1, 100, 50)
                : 85
            setHydrationScore(Math.round(clamp(hydrated * 0.7 + caffeineScore * 0.3, 40, 100)))
          } else {
            setHydrationScore(null)
          }
          const hasStepsData =
            typeof activityJson?.activity?.steps === "number" &&
            Number.isFinite(activityJson.activity.steps)
          const hasActiveMinutesData =
            typeof activityJson?.activity?.activeMinutes === "number" &&
            Number.isFinite(activityJson.activity.activeMinutes)
          setIsActivityEstimated((hasStepsData && !hasActiveMinutesData) || (!hasStepsData && hasActiveMinutesData))
        })()
      } catch {
        if (!cancelled) {
          setDetail(null)
          setHasRhythmData(false)
          setSocialJetlag(null)
          setSleepDeficit(null)
          setFatigueRisk(null)
          setBingeRisk(null)
          setYesterdayScore(null)
          setDailyScores([])
          setHydrationScore(null)
          setIsActivityEstimated(false)
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
    const category = socialJetlag?.category
    if (category === "low") return "Well aligned"
    if (category === "moderate") return "Moderate misalignment"
    if (category === "high") return "High misalignment"
    return "Calculating..."
  }, [socialJetlag?.category])

  const sleepComposite = detail ? computeSleepComposite(detail) : null

  const breakdownRows = useMemo((): BodyClockBreakdownRow[] => {
    if (detail == null) return []
    const rawRecovery = detail.recovery_score
    const recoveryHasMeasuredValue =
      typeof rawRecovery === "number" && rawRecovery > 0 && hasRhythmData !== false
    const recoveryValue = recoveryHasMeasuredValue ? rawRecovery : 45
    const recoveryTag = recoveryHasMeasuredValue ? undefined : "Estimated"
    const rawActivity = detail.activity_score
    const activityHasMeasuredValue = typeof rawActivity === "number" && rawActivity > 0
    const activityValue = activityHasMeasuredValue ? rawActivity : 50
    const activityTag = !activityHasMeasuredValue || isActivityEstimated ? "Estimated" : undefined
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
        value: detail.shift_pattern_score === 0 ? null : detail.shift_pattern_score,
        group: "sleepRhythm",
        fill: "cyan",
      },
      {
        id: "recovery",
        label: t("detail.bodyClock.factorRecovery"),
        tag: recoveryTag,
        value: recoveryValue,
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
        label: "Hydration",
        value: hydrationScore,
        group: "day",
        fill: "amber",
      },
      {
        id: "activity",
        label: "Activity",
        tag: activityTag,
        value: activityValue,
        group: "day",
        fill: "sky",
      },
    ]
  }, [detail, hasRhythmData, hydrationScore, isActivityEstimated, sleepComposite, t])

  const trustWeekly = weekly?.hasRealData === true

  const breakdownMissingCount = useMemo(
    () => breakdownRows.filter((r) => r.value === null).length,
    [breakdownRows],
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
    const weekStart = weekly?.weekStartYmd
    if (!dayLabels.length || scores.length !== 7 || !weekStart) return []

    const todayYmd = utcTodayYmd()
    const yesterdayYmd = addUtcCalendarDays(todayYmd, -1)
    const directDailyByDate = new Map(
      dailyScores
        .filter((r) => typeof r.date === "string")
        .map((r) => [r.date, r.total_score] as const),
    )
    const heroRaw =
      !loading && detail != null
        ? detail.total_score
        : circadianState != null
          ? circadianState.score
        : !loading && detail != null
          ? legacyGaugeScore
          : null
    const hero =
      heroRaw != null ? Math.round(Math.min(100, Math.max(0, heroRaw))) : null

    return dayLabels.map((label, idx) => {
      const ymd = addUtcCalendarDays(weekStart, idx)
      const isToday = ymd === todayYmd
      const direct = directDailyByDate.get(ymd)
      let score =
        typeof direct === "number" && Number.isFinite(direct)
          ? Math.min(100, Math.max(0, Math.round(direct)))
          : Math.min(100, Math.max(0, Math.round(scores[idx] ?? 0)))
      if (
        ymd === yesterdayYmd &&
        score === 0 &&
        typeof yesterdayScore === "number" &&
        Number.isFinite(yesterdayScore)
      ) {
        score = Math.min(100, Math.max(0, Math.round(yesterdayScore)))
      }
      if (isToday && hero != null) score = hero
      return { day: label, score, isToday }
    })
  }, [
    trustWeekly,
    weekly?.days,
    weekly?.bodyClockScores,
    weekly?.weekStartYmd,
    detail?.total_score,
    circadianState,
    loading,
    detail,
    yesterdayScore,
    dailyScores,
    legacyGaugeScore,
  ])

  const chartReady = chartDays.length === 7

  const motivationMessage = useMemo(() => {
    const prefix = displayName ? `${displayName}, ` : ""
    const heroRaw =
      circadianState != null
        ? circadianState.score
        : !loading && detail != null
          ? legacyGaugeScore
          : null
    const hero =
      heroRaw != null ? Math.round(Math.min(100, Math.max(0, heroRaw))) : null

    if (hero == null && (circadianAgentLoading || loading)) {
      return t("detail.bodyClock.motivationLoading", { prefix })
    }
    if (hero == null || (noData && detail == null)) {
      return t("detail.bodyClock.motivationGeneric", { prefix })
    }

    if (hero < 58 || (detail != null && (detail.sleep_score ?? 0) < 48 && hero < 68)) {
      return t("detail.bodyClock.motivationUnderTarget", { prefix })
    }

    if (
      scoreForecastTomorrowDelta.tone === "down" &&
      circadianState != null &&
      hero >= 55
    ) {
      return t("detail.bodyClock.motivationForecastDip", { prefix })
    }

    if (hero < 75) {
      return t("detail.bodyClock.motivationSteady", { prefix })
    }

    return t("detail.bodyClock.motivationStrong", { prefix })
  }, [
    displayName,
    circadianState,
    loading,
    detail,
    legacyGaugeScore,
    noData,
    circadianAgentLoading,
    scoreForecastTomorrowDelta.tone,
    t,
  ])

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
    if (loading) return { loading: true as const, value: null as number | null, text: null as string | null }
    const raw = detail?.total_score
    if (typeof raw === "number" && !Number.isNaN(raw)) {
      const v = Math.round(Math.min(100, Math.max(0, raw)))
      return { loading: false as const, value: v, text: `${v}/100` }
    }
    return { loading: false as const, value: null as number | null, text: "—" }
  }, [loading, detail?.total_score])

  const avgSleepDisplay = useMemo(() => {
    const daily = sleepDeficit?.daily ?? []
    const vals = daily
      .map((d) => (typeof d?.actual === "number" && !Number.isNaN(d.actual) ? d.actual : null))
      .filter((v): v is number => v !== null)
    if (!vals.length) return "—"
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return `${avg.toFixed(1)}h`
  }, [sleepDeficit?.daily])

  const weeklyOffsetDisplay = useMemo(() => {
    const w = socialJetlag?.weeklyAverageMisalignmentHours
    return typeof w === "number" && !Number.isNaN(w) ? `${w.toFixed(1)}h` : "—"
  }, [socialJetlag?.weeklyAverageMisalignmentHours])

  const alignmentDisplay = useMemo(() => {
    const c = socialJetlag?.category
    if (c === "low") return { value: "Low", cls: "text-green-500" }
    if (c === "moderate") return { value: "Moderate", cls: "text-amber-500" }
    if (c === "high") return { value: "High", cls: "text-red-500" }
    return { value: "—", cls: "" }
  }, [socialJetlag?.category])

  const statusPillClass =
    socialJetlag?.category === "low"
      ? "bg-green-50 text-green-500 ring-green-100"
      : socialJetlag?.category === "moderate"
        ? "bg-amber-50 text-amber-500 ring-amber-100"
        : socialJetlag?.category === "high"
          ? "bg-rose-50 text-red-500 ring-rose-100"
          : "bg-slate-100 text-slate-700 ring-slate-200"

  const fatigueTone =
    fatigueRisk?.level === "low" ? "bg-green-500" : fatigueRisk?.level === "moderate" ? "bg-amber-500" : "bg-red-500"
  const bingeTone =
    bingeRisk?.level === "low" ? "bg-green-500" : bingeRisk?.level === "medium" ? "bg-amber-500" : "bg-red-500"
  const fatigueLevelLabel =
    fatigueRisk?.level ? `${fatigueRisk.level[0].toUpperCase()}${fatigueRisk.level.slice(1)} (${fatigueRisk.score ?? "—"})` : "—"
  const bingeLevelLabel =
    bingeRisk?.level ? `${bingeRisk.level[0].toUpperCase()}${bingeRisk.level.slice(1)} (${bingeRisk.score ?? "—"})` : "—"

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className={`max-w-[430px] mx-auto min-h-screen px-2 pb-10 pt-4 flex flex-col gap-6 ${inter.className}`}>
        <header className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full border border-[var(--border-subtle)] bg-[var(--card)] text-[var(--text-soft)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className={`text-xl font-semibold tracking-tight text-[var(--text-main)] ${inter.className}`}>
            Circadian Rhythm
          </h1>
        </header>

        {/* Hero — weekly score card + stacked cards */}
        <section className="flex w-full flex-col items-center gap-6">
          <CircadianCard showMainSections={false} showSupportingSections />
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

        </section>

        <BodyClockSimpleHabitsCard
          title={t("detail.bodyClock.quickHabits")}
          labels={{
            sunrise: t("detail.bodyClock.habitTileSleepMidpoint"),
            anchor: t("detail.bodyClock.habitTileAnchorMeal"),
            sun: t("detail.bodyClock.habitTileLightWaking"),
            coffee: t("detail.bodyClock.habitTileCaffeine"),
          }}
        />

        <BodyClockMotivationCard message={motivationMessage} />

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
