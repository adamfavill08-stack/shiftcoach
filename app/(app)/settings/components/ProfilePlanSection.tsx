'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

export function ProfilePlanSection() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/profile')}
      className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 hover:bg-white/70 transition-colors w-full"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="h-9 w-9 rounded-xl bg-white/60 border border-slate-200/50 grid place-items-center flex-shrink-0">
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-slate-800">Profile</h3>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
    </button>
  )
}

