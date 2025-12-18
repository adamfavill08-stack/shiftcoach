'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

export function ProfilePlanSection() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/profile')}
      className="group relative overflow-hidden w-full flex items-center justify-between rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm px-3.5 py-2.5 border border-white/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] hover:scale-[1.01]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex items-center gap-3 flex-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/60 shadow-sm">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-[12px] font-semibold text-slate-900 flex-1 text-left leading-snug">Profile</h3>
        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  )
}

