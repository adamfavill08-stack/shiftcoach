"use client"

import { ReactNode } from "react"
import { useCoachingState } from "@/lib/hooks/useCoachingState"

export function Header({ title, right }: { title?: string; right?: ReactNode }) {
  const { state: coachingState } = useCoachingState()

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-2xl"
      style={{
        backgroundImage: "radial-gradient(circle at top, var(--bg-soft), var(--bg))",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-3 w-3 shrink-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
            <span
              className="truncate text-lg font-semibold tracking-tight"
              style={{ color: "var(--text-main)" }}
            >
              {title ?? "Shift Coach"}
            </span>
          </div>
          {coachingState ? (
            <div
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur-xl"
              style={{
                backgroundColor:
                  coachingState.status === "red"
                    ? "rgba(239, 68, 68, 0.15)"
                    : coachingState.status === "amber"
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(34, 197, 94, 0.15)",
                borderColor:
                  coachingState.status === "red"
                    ? "rgba(239, 68, 68, 0.3)"
                    : coachingState.status === "amber"
                      ? "rgba(245, 158, 11, 0.3)"
                      : "rgba(34, 197, 94, 0.3)",
                color:
                  coachingState.status === "red"
                    ? "#dc2626"
                    : coachingState.status === "amber"
                      ? "#d97706"
                      : "#16a34a",
              }}
            >
              {coachingState.status === "red"
                ? "Today: Protect your energy"
                : coachingState.status === "amber"
                  ? "Today: Go gentle"
                  : "Today: Good day to build momentum"}
            </div>
          ) : null}
        </div>
        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>
    </header>
  )
}
