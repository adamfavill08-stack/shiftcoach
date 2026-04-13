"use client"

import { Inter } from "next/font/google"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

/** Score Forecast card — exact colour tokens (light). */
const colors = {
  tileDefault: "#F5F5F5",
  tileWarning: "#FFF9E6",
  tileBorderWarn: "#FFE082",
  scoreGreen: "#2E7D32",
  scoreOrange: "#F57C00",
  scoreRed: "#E65100",
  deltaRed: "#E53935",
  warnBg: "#FFF9E6",
  warnBorder: "#FFE082",
  warnText: "#795548",
  warnIcon: "#F9A825",
  cardBg: "#FFFFFF",
  cardBorder: "#F0F0F0",
} as const

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)))
}

type BodyClockScoreForecastCardProps = {
  todayScore: number
  tomorrowRaw: number
  threeDaysRaw: number
  heading: string
  labelToday: string
  labelTomorrow: string
  labelPlusThree: string
  tomorrowDeltaLabel: string | null
  tomorrowDeltaTone: "down" | "up" | null
  bannerText: string | null
}

export function BodyClockScoreForecastCard({
  todayScore,
  tomorrowRaw,
  threeDaysRaw,
  heading,
  labelToday,
  labelTomorrow,
  labelPlusThree,
  tomorrowDeltaLabel,
  tomorrowDeltaTone,
  bannerText,
}: BodyClockScoreForecastCardProps) {
  const today = clampScore(todayScore)
  const tomorrow = clampScore(tomorrowRaw)
  const threeDays = clampScore(threeDaysRaw)
  const deltaThree = threeDays - today

  const threeMain =
    deltaThree === 0 ? "0" : deltaThree > 0 ? `+${deltaThree}` : `${deltaThree}`

  /** No border on tiles — fill colour defines each box. */
  const tileBase =
    "flex flex-1 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-4 text-center"

  return (
    <section
      className={cn(
        "w-full rounded-xl border p-5 text-left shadow-none dark:!border-[var(--border-subtle)] dark:!bg-[var(--card)]",
        inter.className,
      )}
      style={{
        backgroundColor: colors.cardBg,
        borderColor: colors.cardBorder,
      }}
    >
      <h2 className="text-[9px] font-semibold tracking-tight text-[var(--text-main)]">
        {heading}
      </h2>

      <div className="mt-4 flex items-stretch gap-2">
        <div className={tileBase} style={{ backgroundColor: colors.tileDefault }}>
          <span
            className="text-[26px] font-bold tabular-nums leading-none"
            style={{ color: colors.scoreGreen }}
          >
            ~{today}
          </span>
          <span className="text-xs leading-tight text-[var(--text-muted)]">{labelToday}</span>
          <div className="flex min-h-[18px] w-full items-center justify-center" aria-hidden />
        </div>

        <div className={tileBase} style={{ backgroundColor: colors.tileDefault }}>
          <span
            className="text-[26px] font-bold tabular-nums leading-none"
            style={{ color: colors.scoreOrange }}
          >
            ~{tomorrow}
          </span>
          <span className="text-xs leading-tight text-[var(--text-muted)]">{labelTomorrow}</span>
          <div className="flex min-h-[18px] w-full items-center justify-center">
            {tomorrowDeltaLabel ? (
              <span
                className="text-xs font-semibold tabular-nums leading-none"
                style={{
                  color: tomorrowDeltaTone === "down" ? colors.deltaRed : colors.scoreGreen,
                }}
              >
                {tomorrowDeltaLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className={tileBase} style={{ backgroundColor: colors.tileWarning }}>
          <span
            className="text-[26px] font-bold tabular-nums leading-none dark:text-orange-400"
            style={{ color: colors.scoreRed }}
          >
            {threeMain}
          </span>
          <span className="text-xs leading-tight text-[var(--text-muted)]">{labelPlusThree}</span>
          <div className="min-h-[18px] w-full shrink-0" aria-hidden />
        </div>
      </div>

      {bannerText ? (
        <div
          className={cn("mt-4 flex gap-3 rounded-xl border px-3 py-3 dark:!border-amber-600/70")}
          style={{
            backgroundColor: colors.warnBg,
            borderColor: colors.warnBorder,
          }}
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 dark:text-amber-400"
            strokeWidth={2}
            style={{ color: colors.warnIcon }}
            aria-hidden
          />
          <p
            className="text-xs font-medium leading-relaxed dark:!text-amber-100/90"
            style={{ color: colors.warnText }}
          >
            {bannerText}
          </p>
        </div>
      ) : null}
    </section>
  )
}
