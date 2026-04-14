"use client"

import { useMemo, useState } from "react"
import { Inter } from "next/font/google"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

/** First metrics shown before expand (order must match page row order). */
const COLLAPSED_COUNT = 3

export type BodyClockBreakdownRow = {
  id: string
  label: string
  tag?: string
  /** Null = insufficient data (e.g. bedtime consistency not computable). */
  value: number | null
  group: "sleepRhythm" | "day"
  fill: "green" | "cyan" | "amber" | "sky" | "slate"
  /** Slate bar even when value &gt; 0 (e.g. meal timing context) */
  barMuted?: boolean
}

const FILL: Record<BodyClockBreakdownRow["fill"], string> = {
  green: "#66BB6A",
  cyan: "#00BCD4",
  amber: "#FFA726",
  sky: "#29B6F6",
  slate: "#94a3b8",
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

function BreakdownRowView({ row }: { row: BodyClockBreakdownRow }) {
  const raw = row.value
  const missing = raw === null
  const v = missing ? 0 : clampPct(raw)
  const empty = missing || v === 0
  const fillKey = row.barMuted ? "slate" : row.fill
  const fillColor = FILL[fillKey]

  return (
    <div className={cn("space-y-2", inter.className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "text-sm font-medium",
              empty ? "text-[#CCC] dark:text-neutral-600" : "text-[var(--text-main)]",
            )}
          >
            {row.label}
          </span>
          {row.tag ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 ring-1 ring-inset ring-slate-200">
              {row.tag}
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 text-sm font-bold tabular-nums",
            empty ? "text-[#CCC] dark:text-neutral-600" : "text-[var(--text-main)]",
          )}
        >
          {missing ? "—" : v}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ring-bg)]">
        {!missing && v > 0 ? (
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${v}%`, backgroundColor: fillColor }}
          />
        ) : null}
      </div>
    </div>
  )
}

type BodyClockBreakdownCardProps = {
  title: string
  rows: BodyClockBreakdownRow[]
  /** Pill label when collapsed (e.g. “All”) */
  expandLabel: string
  /** Pill label when expanded (e.g. “Less”) */
  collapseLabel: string
  /** Accessible name for the toggle */
  toggleAriaLabel: string
}

export function BodyClockBreakdownCard({
  title,
  rows,
  expandLabel,
  collapseLabel,
  toggleAriaLabel,
}: BodyClockBreakdownCardProps) {
  const [expanded, setExpanded] = useState(false)

  const hasMore = rows.length > COLLAPSED_COUNT

  const visible = useMemo(() => {
    if (expanded || !hasMore) return rows
    return rows.slice(0, COLLAPSED_COUNT)
  }, [rows, expanded, hasMore])

  return (
    <section
      className={cn(
        "w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-5 text-left shadow-none",
        inter.className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-[9px] font-semibold tracking-tight text-[var(--text-main)] leading-snug">
          {title}
        </h2>
        {hasMore ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#00BCD4] px-3 py-1.5",
              "text-sm font-semibold text-[#00BCD4]",
              "outline-none transition-colors hover:bg-[#00BCD4]/10",
              "focus-visible:ring-2 focus-visible:ring-[#00BCD4]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
            )}
            aria-expanded={expanded}
            aria-label={toggleAriaLabel}
          >
            {expanded ? collapseLabel : expandLabel}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")}
              aria-hidden
              strokeWidth={2.5}
            />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
        {visible.map((row) => (
          <BreakdownRowView key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
