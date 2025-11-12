"use client"

import { MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type CoachChatFabProps = {
  unreadCount?: number
  className?: string
}

export function CoachChatFab({ unreadCount = 3, className }: CoachChatFabProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push("/coach")}
      className={cn(
        "group fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full",
        "bg-white text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.25)]",
        "dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_30px_rgba(0,0,0,0.7)]",
        "ring-2 ring-inset ring-slate-200 dark:ring-slate-700",
        "transition-transform hover:scale-105 active:scale-95",
        className,
      )}
      aria-label="Open coach chat"
    >
      <MessageCircle className="h-6 w-6" strokeWidth={2.4} />
      <span className="pointer-events-none absolute -bottom-1 -right-1 inline-flex min-w-[26px] translate-y-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white shadow-md dark:bg-white dark:text-slate-900">
        {unreadCount}
      </span>
    </button>
  )
}


