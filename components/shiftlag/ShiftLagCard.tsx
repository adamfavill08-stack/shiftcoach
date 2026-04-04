"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Inter } from "next/font/google"
import type { ShiftLagMetrics } from "@/lib/shiftlag/calculateShiftLag"
import { useTranslation } from "@/components/providers/language-provider"
import { apiErrorMessageFromJson } from "@/lib/api/clientErrorMessage"
import { authedFetch } from "@/lib/supabase/authedFetch"
import { riskScaleBarMarkerFill } from "@/lib/riskScaleBarMarker"

const inter = Inter({ subsets: ["latin"] })

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

      const res = await authedFetch("/api/shiftlag", { cache: "no-store" })

      if (!res.ok) {
        const errorText = await res.text()
        let errorJson: unknown
        try {
          errorJson = JSON.parse(errorText)
        } catch {
          errorJson = { error: errorText || `HTTP ${res.status}` }
        }
        if (res.status === 401 || res.status === 403) {
          console.warn("[ShiftLagCard] API auth not ready", res.status)
        } else {
          console.error("[ShiftLagCard] API error:", res.status, errorJson)
        }
        setError(apiErrorMessageFromJson(errorJson, `Failed to fetch: ${res.status}`))
        return
      }

      const json = await res.json()
      if (json.error) {
        setError(apiErrorMessageFromJson(json, "Unable to load ShiftLag"))
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
  const scorePct = data ? Math.max(0, Math.min(100, data.score)) : 0
  const bubbleTone =
    data?.level === "high"
      ? "bg-rose-100 text-rose-800"
      : data?.level === "moderate"
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-800"
  const markerFill = riskScaleBarMarkerFill(scorePct)

  return (
    <section
      className={`w-full rounded-xl border border-slate-200 bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${compact ? "h-full w-full min-w-0" : ""}`}
    >
      <Link
        href="/shift-lag"
        className={`relative flex h-full min-h-0 flex-col justify-center ${compact ? "min-h-[6.5rem] px-3 pb-3 pt-2 pr-8" : "px-5 pb-4 pr-10 pt-3.5"}`}
      >
        <ChevronRight
          className={`pointer-events-none absolute text-slate-400 ${compact ? "right-2 top-2 h-3.5 w-3.5" : "right-3 top-2.5 h-4 w-4"}`}
          aria-hidden
        />
        <div className={`${compact ? "flex items-center gap-2" : "space-y-2"}`}>
          <div className={`min-w-0 flex-1 ${compact ? "space-y-1" : "space-y-2"}`}>
            <span
              className={`block font-semibold leading-tight text-black ${inter.className} ${compact ? "text-[10px] tracking-[0.08em]" : "text-sm tracking-[0.08em]"}`}
            >
              Shift lag
            </span>

            {loading ? (
              <div
                className={`max-w-full rounded bg-slate-200 animate-pulse ${compact ? "h-5 w-14" : "h-8 w-36"}`}
              />
            ) : error ? (
              <p className={`text-slate-600 ${compact ? "text-[11px] leading-tight" : "text-sm"}`}>
                {typeof error === "string" ? error : "Unable to load Shift lag"}
              </p>
            ) : data && isUnlockPlaceholder(data) ? (
              <p className={`text-slate-500 ${compact ? "text-[10px] leading-snug" : "text-sm"}`}>
                {t("dashboard.shiftLag.unlockHint")}
              </p>
            ) : data && isCalcFailure(data) ? (
              <p className={`text-slate-600 ${compact ? "text-[11px] leading-tight" : "text-sm"}`}>{data.explanation}</p>
            ) : showScoreRow && data && compact ? (
              <span
                className={`block font-semibold tabular-nums text-slate-900 ${compact ? "text-[15px] leading-tight" : "text-lg"}`}
              >
                {data.score}
                {t("dashboard.shiftLag.per100")}
              </span>
            ) : showScoreRow && data && !compact ? (
              <p className="text-[11px] leading-tight text-slate-500">
                Rolling lag from your recent shift timing and sleep rhythm.
              </p>
            ) : null}
          </div>

          {showScoreRow && data && !compact ? (
            <div className="relative ml-auto mr-0 w-full max-w-[130px] translate-x-3 pb-1 pt-[26px]">
              <div
                className={`absolute top-0 -translate-x-1/2 rounded-lg px-2 py-0.5 text-center leading-none shadow-sm ${bubbleTone}`}
                style={{ left: `${scorePct}%` }}
              >
                <p className="text-[14px] font-semibold tabular-nums">{data.score}</p>
                <span className={`absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 ${bubbleTone}`} />
              </div>
              <div className="relative">
                <div className="h-3 w-full overflow-hidden rounded-full">
                  <div className="grid h-full w-full grid-cols-3">
                    <div className="bg-emerald-300" />
                    <div className="bg-emerald-400" />
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500" />
                  </div>
                </div>
                <span
                  className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white box-border"
                  style={{ left: `${scorePct}%`, backgroundColor: markerFill }}
                  aria-hidden
                />
              </div>
            </div>
          ) : null}

          {showScoreRow && data && compact ? (
            <div className="relative ml-auto w-full max-w-[92px] shrink-0 self-center pb-0.5 pt-1">
              <div className="h-2.5 w-full overflow-hidden rounded-full">
                <div className="grid h-full w-full grid-cols-3">
                  <div className="bg-emerald-300" />
                  <div className="bg-emerald-400" />
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500" />
                </div>
              </div>
              <span
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white box-border"
                style={{ left: `${scorePct}%`, backgroundColor: markerFill }}
                aria-hidden
              />
            </div>
          ) : null}
        </div>
      </Link>
    </section>
  )
}
