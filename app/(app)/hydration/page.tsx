"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Droplets, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useTodayNutrition } from "@/lib/hooks/useTodayNutrition"
import { useHydrationWeek } from "@/lib/hooks/useHydrationWeek"
import { useTranslation } from "@/components/providers/language-provider"
import { authedFetch } from "@/lib/supabase/authedFetch"

export default function HydrationPage() {
  const { t } = useTranslation()
  const { data } = useTodayNutrition()
  const { data: weekData, loading: weekLoading } = useHydrationWeek()

  const targetMl = data?.hydrationTargets?.water_ml ?? 0
  const consumedMlInitial = data?.hydrationIntake?.water_ml ?? 0

  const [baseMl, setBaseMl] = useState<number>(consumedMlInitial)
  const [selectedMl, setSelectedMl] = useState<number>(consumedMlInitial)
  const [saving, setSaving] = useState(false)

  const deviceTz =
    typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"

  useEffect(() => {
    setBaseMl(consumedMlInitial)
    setSelectedMl(consumedMlInitial)
  }, [consumedMlInitial])

  const targetLitres = useMemo(
    () => (targetMl > 0 ? (targetMl / 1000).toFixed(targetMl >= 2000 ? 1 : 2) : "—"),
    [targetMl],
  )

  const selectedLitres = useMemo(
    () => (selectedMl > 0 ? (selectedMl / 1000).toFixed(2) : "0.00"),
    [selectedMl],
  )

  const levels = useMemo(() => {
    if (targetMl <= 0) return []

    const stepMl = 500 // 0.5 L steps for clear labels
    const result: { fraction: number; ml: number }[] = []

    for (let ml = stepMl; ml <= targetMl; ml += stepMl) {
      const fraction = ml / targetMl
      result.push({ fraction, ml })
    }

    return result
  }, [targetMl])

  const levelsTopToBottom = [...levels].slice().reverse()

  const fillHeightPct =
    targetMl > 0 ? Math.min(100, Math.round((selectedMl / targetMl) * 100)) : 0

  const stepMl = 250

  const handleAdjust = (direction: "up" | "down") => {
    if (targetMl <= 0) return

    const delta = direction === "up" ? stepMl : -stepMl
    const next = Math.min(Math.max(0, selectedMl + delta), targetMl)
    setSelectedMl(next)
  }

  const motivation = useMemo(() => {
    if (targetMl <= 0) return null
    const fraction = selectedMl / targetMl

    if (fraction <= 0) return t("detail.hydration.motivationEmpty")
    if (fraction < 0.35) return t("detail.hydration.motivationLow")
    if (fraction < 0.7) return t("detail.hydration.motivationMid")
    if (fraction < 0.95) return t("detail.hydration.motivationHigh")
    return t("detail.hydration.motivationFull")
  }, [selectedMl, targetMl, t])

  const persistDelta = useCallback(
    async (delta: number, baselineBeforeSave: number) => {
      if (delta === 0) return
      try {
        setSaving(true)
        const res = await authedFetch(`/api/logs/water?tz=${encodeURIComponent(deviceTz)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ml: delta }),
        })

        const json = (await res.json().catch(() => null)) as { total?: number } | null
        if (!res.ok || typeof json?.total !== "number") {
          if (!res.ok) console.error("[HydrationPage] water log failed", res.status)
          setSelectedMl(baselineBeforeSave)
          return
        }

        const clamped = Math.max(0, Math.min(Math.round(json.total), targetMl || Number.POSITIVE_INFINITY))
        setBaseMl(clamped)
        setSelectedMl(clamped)
        window.dispatchEvent(new Event("water-logged"))
      } catch {
        setSelectedMl(baselineBeforeSave)
      } finally {
        setSaving(false)
      }
    },
    [deviceTz, targetMl],
  )

  useEffect(() => {
    const delta = Math.round(selectedMl - baseMl)
    if (delta === 0 || saving) return
    void persistDelta(delta, baseMl)
  }, [selectedMl, baseMl, saving, persistDelta])

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pt-4 pb-8 flex flex-col gap-4">
        {/* Header */}
        <header className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            aria-label={t("detail.common.backToDashboard")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
              <Droplets className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                {t("detail.hydration.title")}
              </h1>
            </div>
          </div>
        </header>

        {/* Summary + jug card (single, borderless) */}
        <section className="rounded-xl bg-white px-4 py-3.5 flex flex-col items-center gap-2.5">
          <div className="w-full flex items-center justify-between text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-900 text-[11px] uppercase tracking-[0.16em]">
                {t("detail.hydration.todaysGoal")}
              </p>
              <p className="mt-1 text-sm">
                {targetLitres}
                <span className="ml-1 text-slate-500">{t("detail.hydration.litreSuffix")}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px]">{t("detail.hydration.selected")}</p>
              <p className="text-sm font-semibold text-slate-900">
                {selectedLitres}
                <span className="ml-1 text-slate-500">{t("detail.hydration.litreSuffix")}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-5">
            {/* Left arrow - increase */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"
                onClick={() => handleAdjust("up")}
                disabled={saving || targetMl <= 0}
                aria-label={t("detail.hydration.ariaIncrease")}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
            <div className="relative h-56 w-32">
              {/* Jug outline + lid */}
              <div className="absolute -top-3 left-6 right-6 h-3 rounded-t-2xl rounded-b-md border-2 border-slate-200 bg-slate-100" />
              <div className="absolute inset-0 rounded-[32px] border-2 border-slate-200 bg-slate-50/40 overflow-hidden">
                {/* Measurement ticks */}
                <div className="absolute inset-x-2 top-3 bottom-3 flex flex-col justify-between pointer-events-none">
                  {levelsTopToBottom.map((level) => (
                    <div key={level.fraction} className="flex items-center justify-between">
                      <div className="h-[1px] w-3 bg-slate-200" />
                      <span className="text-[9px] text-slate-400">
                        {(level.ml / 1000).toFixed(1)}L
                      </span>
                    </div>
                  ))}
                </div>

                {/* Filled water */}
                <div
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-500 via-sky-400 to-sky-300"
                  style={{ height: `${fillHeightPct}%` }}
                />
              </div>

              {/* Clickable levels */}
              <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-end pb-3">
                {levelsTopToBottom.map((level) => (
                  <button
                    key={level.fraction}
                    type="button"
                    onClick={() => setSelectedMl(level.ml)}
                    disabled={saving || targetMl <= 0}
                    className="relative flex-1 w-full"
                    aria-label={t("detail.hydration.ariaLogLitres", {
                      n: (level.ml / 1000).toFixed(2),
                    })}
                  />
                ))}
              </div>
            </div>

            {/* Right arrow - decrease */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"
                onClick={() => handleAdjust("down")}
                disabled={saving || targetMl <= 0}
                aria-label={t("detail.hydration.ariaDecrease")}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center max-w-xs space-y-1">
            <p>{t("detail.hydration.jugHelp")}</p>
            {motivation && (
              <p className="font-medium text-slate-700">
                {motivation}
              </p>
            )}
          </div>
        </section>

        {/* Education card: shift work & hydration */}
        <section className="rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
            {t("detail.hydration.whyTitle")}
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">{t("detail.hydration.whyP1")}</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">{t("detail.hydration.whyP2")}</p>
        </section>

        {/* Last 7 days hydration card */}
        <section className="rounded-xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-700">
                {t("detail.hydration.weeklyTitle")}
              </p>
              <p className="text-[11px] text-slate-500">{t("detail.hydration.weeklySub")}</p>
            </div>
          </div>

          <HydrationWeeklyBarGraph
            days={weekData.days}
            targets={weekData.hydrationTargetMl}
            actuals={weekData.hydrationActualMl}
            todayHydrationDayKey={weekData.todayHydrationDayKey}
            dayKeys={weekData.dayKeys}
            loading={weekLoading}
          />
        </section>

        {/* ShiftCoach logo footer */}
        <div className="pt-4 pb-2 flex flex-col items-center gap-1">
          <div className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-400">
            {t("welcome.logoAlt")}
          </div>
          <p className="text-[10px] text-slate-400 text-center max-w-[260px]">
            {t("detail.common.disclaimer")}
          </p>
        </div>
      </div>
    </main>
  )
}

type HydrationWeeklyProps = {
  days: string[]
  targets: number[]
  actuals: number[]
  todayHydrationDayKey: string
  dayKeys: string[]
  loading: boolean
}

function HydrationWeeklyBarGraph({
  days,
  targets,
  actuals,
  todayHydrationDayKey,
  dayKeys,
  loading,
}: HydrationWeeklyProps) {
  if (loading) {
    return (
      <div className="mt-1 flex h-24 items-end justify-between gap-2 px-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="h-20 w-5 animate-pulse rounded-full bg-slate-100" />
            <div className="h-2 w-3 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  if (!days.length || days.length !== 7 || targets.length !== 7 || actuals.length !== 7) return null

  const maxMl = Math.max(...targets, ...actuals, 1)

  return (
    <div className="mt-1 flex items-end justify-between gap-2 px-1">
      {days.map((label, idx) => {
        const target = targets[idx] ?? 0
        const actual = actuals[idx] ?? 0
        const pct = Math.min(100, Math.round((actual / maxMl) * 100))
        const targetPct = Math.min(100, Math.round((target / maxMl) * 100))

        const key = dayKeys[idx] ?? ""
        const isToday = key === todayHydrationDayKey

        return (
          <div key={`${key}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative h-24 w-5 flex items-end justify-center">
              {/* Target outline */}
              <div className="absolute bottom-0 w-3 rounded-full bg-slate-100" style={{ height: `${targetPct}%` }} />
              {/* Actual fill */}
              <div
                className="relative w-3 rounded-full bg-gradient-to-t from-sky-500 to-emerald-400"
                style={{ height: `${pct}%` }}
              />
            </div>
            <span
              className={`text-[9px] uppercase tracking-[0.12em] ${
                isToday ? "text-sky-700 font-semibold" : "text-slate-500"
              }`}
              title={key}
            >
              {label.charAt(0)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
