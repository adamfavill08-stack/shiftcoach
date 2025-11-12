'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'

import { CoachChatModal } from '@/components/coach/CoachChatModal'

export default function DashboardHeader() {
  const router = useRouter()
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false)

  return (
    <>
      <header className="px-5 pt-6">
        <div className="flex h-[48px] items-center justify-between bg-transparent px-4 pt-1 pb-2">
          <Image
            src="/shiftcoach.png"
            alt="ShiftCoach Logo"
            width={130}
            height={32}
            className="object-contain"
            priority
          />
          <div className="flex items-center gap-5">
            <button
              onClick={() => setIsCoachChatOpen(true)}
              className="p-1.5 rounded-full bg-white/80 shadow-sm shadow-slate-300/40 transition hover:scale-[1.03] dark:bg-slate-800 dark:shadow-slate-900/60"
              aria-label="Chat with your coach"
              type="button"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="url(#chatGradient)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <defs>
                  <linearGradient id="chatGradient" x1="0" y1="0" x2="24" y2="24">
                    <stop offset="0%" stopColor="#0EA5E9" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
                <path d="M5 19l1.5-3.5" />
                <path d="M6.5 15.5H6a4 4 0 01-4-4V8a4 4 0 014-4h12a4 4 0 014 4v3.5a4 4 0 01-4 4h-5l-4 3.5" />
                <path d="M9 9h6" />
                <path d="M9 12h3" />
              </svg>
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="p-2 rounded-full hover:bg-gray-100 transition dark:hover:bg-slate-800"
              aria-label="Open settings"
              type="button"
            >
              <MoreHorizontal size={22} className="text-gray-700 dark:text-slate-200" />
            </button>
          </div>
        </div>
      </header>

      {isCoachChatOpen && (
        <CoachChatModal onClose={() => setIsCoachChatOpen(false)} />
      )}
    </>
  )
}
