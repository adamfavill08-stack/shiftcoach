'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Clock, Calendar, MoreHorizontal } from 'lucide-react'

import { CoachChatModal } from '@/components/coach/CoachChatModal'

export default function DashboardHeader() {
  const router = useRouter()
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false)

  return (
    <>
      <header className="px-5 pt-6">
        <div className="flex h-[48px] items-center justify-between bg-transparent px-4 pt-1 pb-2">
          <Image
            src="/scpremium-logo.svg"
            alt="ShiftCoach Logo"
            width={130}
            height={32}
            className="object-contain"
            priority
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-full bg-white/90 shadow-sm border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95"
              aria-label="Time"
              type="button"
            >
              <Clock className="w-5 h-5 text-slate-700" strokeWidth={2} />
            </button>
            <button
              onClick={() => router.push('/rota')}
              className="p-2 rounded-full bg-white/90 shadow-sm border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95"
              aria-label="Calendar"
              type="button"
            >
              <Calendar className="w-5 h-5 text-slate-700" strokeWidth={2} />
            </button>
            <button
              onClick={() => setIsCoachChatOpen(true)}
              className="p-2 rounded-full bg-white/90 shadow-sm border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95"
              aria-label="Chat with your coach"
              type="button"
            >
              <Image
                src="/bubble-icon.png"
                alt="Shift Coach"
                width={30}
                height={30}
                className="w-[30px] h-[30px] object-contain"
                style={{
                  filter: 'brightness(0) saturate(100%) invert(15%) sepia(9%) saturate(1033%) hue-rotate(169deg) brightness(95%) contrast(88%)',
                }}
              />
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="p-2 rounded-full bg-white/90 shadow-sm border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95"
              aria-label="More options"
              type="button"
            >
              <MoreHorizontal size={20} className="text-slate-700" strokeWidth={2} />
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
