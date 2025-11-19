"use client"

import React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type ShiftCoachCardProps = {
  title?: string // defaults to "Shift Coach"
  subtitle?: string // defaults to "Preparing your tip…"
  className?: string // optional extra styles
  onClick?: (e?: React.MouseEvent) => void // optional click handler
}

export function ShiftCoachCard({
  title = "Shift Coach",
  subtitle = "Preparing your tip…",
  className,
  onClick,
}: ShiftCoachCardProps) {
  return (
    <div
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation()
          onClick()
        }
      }}
      className={cn(
        "relative flex items-center gap-3 rounded-2xl bg-white p-5",
        "border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        "backdrop-blur-sm",
        onClick && "cursor-pointer transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-[0.98]",
        className
      )}
    >
      {/* Speech bubble icon */}
      <div className="flex-shrink-0">
        <Image
          src="/shiftcoach-bubble.svg"
          alt="Shift Coach Icon"
          width={44}
          height={44}
          className="rounded-2xl shadow-sm pointer-events-none select-none"
          priority
        />
      </div>

      {/* Text content - stacked vertically */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="text-[17px] font-semibold text-slate-900 tracking-tight">
          {title}
        </h3>
        <p className="text-[15px] text-slate-600 leading-relaxed mt-1.5">
          {subtitle}
        </p>
      </div>
    </div>
  )
}

