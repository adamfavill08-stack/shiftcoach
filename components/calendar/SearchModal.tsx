'use client'

import { X } from 'lucide-react'
import { EventSearch } from './EventSearch'
import { Event } from '@/lib/models/calendar/Event'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onEventClick?: (event: Event) => void
}

export function SearchModal({ isOpen, onClose, onEventClick }: SearchModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white/75 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_24px_60px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 dark:from-slate-900/70 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl opacity-0 dark:opacity-100" />
        <div className="pointer-events-none absolute inset-0 ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Search Events
            </h2>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Component */}
          <EventSearch
            onEventClick={(event) => {
              onEventClick?.(event)
              onClose()
            }}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  )
}

