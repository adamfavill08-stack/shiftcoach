'use client'

import { useRef, useEffect } from 'react'
import { Calendar, Briefcase, X } from 'lucide-react'

interface AddItemMenuProps {
  isOpen: boolean
  onClose: () => void
  onAddEvent: () => void
  onAddShift: () => void
  position?: { bottom: number; right: number }
}

export function AddItemMenu({ isOpen, onClose, onAddEvent, onAddShift, position }: AddItemMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const menuStyle = position
    ? {
        bottom: `${position.bottom + 60}px`,
        right: `${position.right}px`,
      }
    : {
        bottom: '80px',
        right: '24px',
      }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 w-56 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_8px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden"
        style={menuStyle}
      >
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 dark:from-slate-900/70 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl opacity-0 dark:opacity-100" />
        <div className="pointer-events-none absolute inset-0 ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

        {/* Content */}
        <div className="relative z-10 p-2">
          <div className="space-y-1">
            {/* Add Event Option */}
            <button
              onClick={() => {
                onAddEvent()
                onClose()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition group"
            >
              <div className="h-9 w-9 rounded-lg bg-sky-100 dark:bg-sky-950/30 flex items-center justify-center group-hover:bg-sky-200 dark:group-hover:bg-sky-950/50 transition">
                <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">Add Event</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Calendar event</div>
              </div>
            </button>

            {/* Add Shift Option */}
            <button
              onClick={() => {
                onAddShift()
                onClose()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition group"
            >
              <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-950/50 transition">
                <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">Add Shift</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Work shift</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

