"use client"

import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

export type BodyClockScoreDay = {
  day: string
  score: number
  isToday?: boolean
}

function barColor(score: number, isToday: boolean): string {
  if (isToday) return "#00BCD4"
  if (score >= 80) return "#43A047"
  if (score >= 65) return "#66BB6A"
  if (score >= 50) return "#FFA726"
  return "#EF5350"
}

type BodyClockScoreCardProps = {
  days: BodyClockScoreDay[]
  chartReady: boolean
  todayScore: number | null
  isLoadingScore?: boolean
  badgeLabel: string
  badgeClassName: string
  avg: number | null
  best: number | null
  trend: number | null
  scoreTitle: string
  todaySuffix: string
  labelSevenDayAvg: string
  labelBestDay: string
  labelTrend: string
  waitingLabel: string
}

export function BodyClockScoreCard({
  days,
  chartReady,
  todayScore,
  isLoadingScore,
  badgeLabel,
  badgeClassName,
  avg,
  best,
  trend,
  scoreTitle,
  todaySuffix,
  labelSevenDayAvg,
  labelBestDay,
  labelTrend,
  waitingLabel,
}: BodyClockScoreCardProps) {
  const trendDisplay =
    trend == null || !chartReady
      ? { text: "—", color: "var(--text-muted)" as const }
      : trend > 0
        ? { text: `↑ +${Math.round(trend)}`, color: "#00838F" as const }
        : trend < 0
          ? { text: `↓ ${Math.round(Math.abs(trend))}`, color: "#C62828" as const }
          : { text: "0", color: "var(--text-muted)" as const }

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-4 pb-4 pt-5 shadow-none",
        inter.className,
      )}
    >
      <div className="mb-[18px] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            {scoreTitle}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[36px] font-extrabold leading-none tracking-[-1.5px] text-[var(--text-main)] tabular-nums">
              {isLoadingScore ? "…" : todayScore == null ? "—" : todayScore}
            </span>
            <span className="text-[13px] text-[var(--text-muted)]">{todaySuffix}</span>
          </div>
        </div>
        <span
          className={cn(
            "mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
            badgeClassName,
          )}
        >
          {badgeLabel}
        </span>
      </div>

      {chartReady && days.length > 0 ? (
        <div className="flex items-end gap-1">
          {days.map(({ day, score, isToday }, idx) => {
            const h = Math.round((Math.min(100, Math.max(0, score)) / 100) * 110)
            const color = barColor(score, !!isToday)
            return (
              <div key={`${day}-${idx}`} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isToday ? "font-bold text-[#00838F]" : "font-medium text-[var(--text-muted)]",
                  )}
                >
                  {score}
                </span>
                <div className="flex h-[110px] w-full flex-col items-center justify-end">
                  <div
                    className={cn(
                      "rounded-t-[10px] rounded-b-[4px] transition-[height] duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
                      isToday ? "w-9 shadow-[0_0_0_3px_rgba(0,188,212,0.2)]" : "w-7",
                    )}
                    style={{ height: h, background: color }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[11px]",
                    isToday ? "font-bold text-[#00BCD4]" : "font-medium text-[var(--text-muted)]",
                  )}
                >
                  {day}
                </span>
                <div className="flex h-2 items-center justify-center">
                  {isToday ? <div className="h-[5px] w-[5px] rounded-full bg-[#00BCD4]" /> : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">{waitingLabel}</p>
      )}

      <div className="mt-3.5 flex justify-between border-t border-[var(--border-subtle)] pt-3.5">
        <div className="text-center">
          <div className="mb-0.5 text-[11px] text-[var(--text-muted)]">{labelSevenDayAvg}</div>
          <div className="text-base font-bold tabular-nums text-[var(--text-main)]">
            {avg != null && chartReady ? Math.round(avg) : "—"}
          </div>
        </div>
        <div className="text-center">
          <div className="mb-0.5 text-[11px] text-[var(--text-muted)]">{labelBestDay}</div>
          <div className="text-base font-bold tabular-nums text-[#2E7D32]">
            {best != null && chartReady ? Math.round(best) : "—"}
          </div>
        </div>
        <div className="text-center">
          <div className="mb-0.5 text-[11px] text-[var(--text-muted)]">{labelTrend}</div>
          <div className="text-base font-bold tabular-nums" style={{ color: trendDisplay.color }}>
            {trendDisplay.text}
          </div>
        </div>
      </div>
    </div>
  )
}
