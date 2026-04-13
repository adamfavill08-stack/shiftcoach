"use client"

import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

const tiles = [
  { emoji: "🌅", key: "sunrise" as const },
  { emoji: "⚓", key: "anchor" as const },
  { emoji: "☀️", key: "sun" as const },
  { emoji: "☕", key: "coffee" as const },
]

type BodyClockSimpleHabitsCardProps = {
  title: string
  labels: Record<(typeof tiles)[number]["key"], string>
}

export function BodyClockSimpleHabitsCard({ title, labels }: BodyClockSimpleHabitsCardProps) {
  return (
    <section
      className={cn(
        "w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-5 text-left shadow-none",
        inter.className,
      )}
    >
      <h2 className="mb-4 text-[9px] font-semibold tracking-tight text-[var(--text-main)] leading-snug">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map(({ emoji, key }) => (
          <div
            key={key}
            className="flex gap-2.5 rounded-xl bg-[#F5F7F9] px-3 py-3 dark:bg-white/[0.06]"
          >
            <span className="text-xl leading-none shrink-0" aria-hidden>
              {emoji}
            </span>
            <p className="min-w-0 text-sm font-medium leading-snug text-[var(--text-main)]">{labels[key]}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
