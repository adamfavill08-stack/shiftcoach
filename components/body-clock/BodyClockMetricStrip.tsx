"use client"

import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

const miniCardClass =
  "flex flex-1 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-2 py-3 shadow-none"

function formatMidpointOffsetHours(h: number): string {
  const rounded = Math.round(h * 10) / 10
  if (rounded === 0) return "0h"
  const sign = rounded > 0 ? "+" : "−"
  const abs = Math.abs(rounded)
  const body = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
  return `${sign}${body}h`
}

type BodyClockMetricStripProps = {
  peakTime: string | null
  lowEnergyTime: string | null
  midpointOffsetHours: number | null
  isLoading?: boolean
  labelPeak: string
  labelLow: string
  labelMidpoint: string
}

export function BodyClockMetricStrip({
  peakTime,
  lowEnergyTime,
  midpointOffsetHours,
  isLoading,
  labelPeak,
  labelLow,
  labelMidpoint,
}: BodyClockMetricStripProps) {
  const peakDisplay = isLoading ? "…" : peakTime ?? "—"
  const lowDisplay = isLoading ? "…" : lowEnergyTime ?? "—"
  const midDisplay =
    isLoading ? "…" : midpointOffsetHours == null ? "—" : formatMidpointOffsetHours(midpointOffsetHours)

  return (
    <div className={cn("flex w-full gap-2", inter.className)}>
      <div className={miniCardClass} aria-label={`${labelPeak} ${peakDisplay}`}>
        <span className="text-xl leading-none" aria-hidden>
          ⚡
        </span>
        <span className="text-lg font-bold tabular-nums leading-tight text-[var(--text-main)]">
          {peakDisplay}
        </span>
        <span className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {labelPeak}
        </span>
      </div>
      <div className={miniCardClass} aria-label={`${labelLow} ${lowDisplay}`}>
        <span className="text-xl leading-none" aria-hidden>
          🌙
        </span>
        <span className="text-lg font-bold tabular-nums leading-tight text-[var(--text-main)]">
          {lowDisplay}
        </span>
        <span className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {labelLow}
        </span>
      </div>
      <div className={miniCardClass} aria-label={`${labelMidpoint} ${midDisplay}`}>
        <span className="text-xl leading-none" aria-hidden>
          ⏱️
        </span>
        <span className="text-lg font-bold tabular-nums leading-tight text-[var(--text-main)]">
          {midDisplay}
        </span>
        <span className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {labelMidpoint}
        </span>
      </div>
    </div>
  )
}
