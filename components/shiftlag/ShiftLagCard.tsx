"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { ShiftLagMetrics, ShiftLagLevel } from "@/lib/shiftlag/calculateShiftLag"
import { useTranslation } from "@/components/providers/language-provider"

function MiniRing({
  value,
  maxValue = 100,
  level,
  size = 64,
}: {
  value: number
  maxValue?: number
  level: ShiftLagLevel
  size?: number
}) {
  const strokeWidth = Math.max(4, Math.round(size / 16))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min(value / maxValue, 1)
  const offset = circumference - percentage * circumference
  const color =
    level === "low" ? "#22c55e" : level === "moderate" ? "#f97316" : "#ef4444"

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-semibold text-slate-900 tabular-nums ${size <= 52 ? "text-sm" : "text-base"}`}
      >
        {Math.max(0, Math.min(100, Math.round(value)))}
      </span>
    </div>
  )
}

function isUnlockPlaceholder(data: ShiftLagMetrics): boolean {
  return (
    data.score === 0 &&
    (data.explanation ?? "").toLowerCase().includes("unlock your shiftlag")
  )
}

function isCalcFailure(data: ShiftLagMetrics): boolean {
  return (data.explanation ?? "").includes("Unable to calculate")
}

export type ShiftLagCardProps = {
  /** Tighter layout for side-by-side tiles on the home dashboard */
  compact?: boolean
}

export function ShiftLagCard({ compact = false }: ShiftLagCardProps) {
  const { t } = useTranslation()
  const [data, setData] = useState<ShiftLagMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/shiftlag", { cache: "no-store" })

      if (!res.ok) {
        const errorText = await res.text()
        let errorJson: { error?: string }
        try {
          errorJson = JSON.parse(errorText)
        } catch {
          errorJson = { error: errorText || `HTTP ${res.status}` }
        }
        console.error("[ShiftLagCard] API error:", res.status, errorJson)
        setError(errorJson.error || `Failed to fetch: ${res.status}`)
        return
      }

      const json = await res.json()
      if (json.error) {
        setError(json.error)
        return
      }

      if (json.score !== undefined && json.level) {
        setData({
          ...json,
          explanation: json.explanation ?? "",
          sleepDebtScore: json.sleepDebtScore ?? 0,
          misalignmentScore: json.misalignmentScore ?? 0,
          instabilityScore: json.instabilityScore ?? 0,
        })
      } else {
        console.warn("[ShiftLagCard] Invalid data structure:", json)
        setError("Invalid data received")
      }
    } catch (err: unknown) {
      console.error("[ShiftLagCard] Fetch error:", err)
      setError("Unable to load ShiftLag data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const handleRefresh = () => {
      fetchData()
    }

    window.addEventListener("sleep-refreshed", handleRefresh)
    window.addEventListener("rota-saved", handleRefresh)
    window.addEventListener("rota-cleared", handleRefresh)

    return () => {
      window.removeEventListener("sleep-refreshed", handleRefresh)
      window.removeEventListener("rota-saved", handleRefresh)
      window.removeEventListener("rota-cleared", handleRefresh)
    }
  }, [])

  const showScoreRow =
    data && !isUnlockPlaceholder(data) && !isCalcFailure(data)
  const showRing = showScoreRow

  const ringSize = compact ? 50 : 64

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${compact ? "h-full w-full min-w-0" : ""}`}
    >
      <Link
        href="/shift-lag"
        className={`relative flex h-full min-h-0 flex-col justify-center ${compact ? "min-h-[6.5rem] px-3 pb-3 pt-2 pr-8" : "px-5 pb-4 pr-10 pt-2.5"}`}
      >
        <ChevronRight
          className={`pointer-events-none absolute text-slate-400 ${compact ? "right-2 top-2 h-3.5 w-3.5" : "right-3 top-2.5 h-4 w-4"}`}
          aria-hidden
        />
        <div className={`flex items-center ${compact ? "gap-2" : "gap-1.5"}`}>
          <div className={`min-w-0 flex-1 ${compact ? "space-y-1" : "space-y-2"}`}>
            <span
              className={`block font-semibold uppercase leading-tight text-slate-700 ${compact ? "text-[10px] tracking-[0.14em]" : "text-xs tracking-[0.16em]"}`}
            >
              {t("dashboard.shiftLag.cardTitle")}
            </span>

            {loading ? (
              <div
                className={`max-w-full rounded bg-slate-200 animate-pulse ${compact ? "h-5 w-14" : "h-8 w-36"}`}
              />
            ) : error ? (
              <p className={`text-slate-600 ${compact ? "text-[11px] leading-tight" : "text-sm"}`}>{error}</p>
            ) : data && isUnlockPlaceholder(data) ? (
              <p className={`text-slate-500 ${compact ? "text-[10px] leading-snug" : "text-sm"}`}>
                {t("dashboard.shiftLag.unlockHint")}
              </p>
            ) : data && isCalcFailure(data) ? (
              <p className={`text-slate-600 ${compact ? "text-[11px] leading-tight" : "text-sm"}`}>{data.explanation}</p>
            ) : showScoreRow && data ? (
              <span
                className={`block font-semibold tabular-nums text-slate-900 ${compact ? "text-[15px] leading-tight" : "text-lg"}`}
              >
                {data.score}
                {t("dashboard.shiftLag.per100")}
              </span>
            ) : null}
          </div>

          {showRing && data ? (
            <div
              className={`flex shrink-0 items-center justify-center ${compact ? "h-[50px] w-[50px]" : ""} ${compact ? "" : "-ml-1"}`}
            >
              <MiniRing value={data.score} level={data.level} size={ringSize} />
            </div>
          ) : null}
        </div>
      </Link>
    </section>
  )
}
