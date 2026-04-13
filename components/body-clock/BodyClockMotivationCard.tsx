"use client"

import { Sparkles } from "lucide-react"
import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

type BodyClockMotivationCardProps = {
  message: string
  className?: string
}

export function BodyClockMotivationCard({ message, className }: BodyClockMotivationCardProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3.5 shadow-none",
        inter.className,
        className,
      )}
      role="status"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-500 dark:bg-cyan-400"
        aria-hidden
      >
        <Sparkles className="h-5 w-5 text-white" strokeWidth={1.75} />
      </div>
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-main)]">{message}</p>
    </div>
  )
}
