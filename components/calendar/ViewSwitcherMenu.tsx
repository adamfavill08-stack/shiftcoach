'use client'

import { useState, useRef, useEffect } from 'react'
import { Grid3x3, Calendar, CalendarDays, CalendarClock } from 'lucide-react'

interface ViewSwitcherMenuProps {
  isOpen: boolean
  onClose: () => void
  currentView: 'month' | 'week' | 'day' | 'year'
  onViewChange: (view: 'month' | 'week' | 'day' | 'year') => void
}

export function ViewSwitcherMenu({ isOpen, onClose, currentView, onViewChange }: ViewSwitcherMenuProps) {
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

  const views = [
    { id: 'month' as const, label: 'Month', icon: Calendar },
    { id: 'week' as const, label: 'Week', icon: CalendarDays },
    { id: 'day' as const, label: 'Day', icon: CalendarClock },
    { id: 'year' as const, label: 'Year', icon: Grid3x3 },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* View Switcher Panel – centered sheet, Simple Calendar–style */}
      <div
        ref={menuRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(22rem,calc(100%-2.5rem))] rounded-3xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-[0_24px_70px_rgba(0,0,0,0.55)] overflow-hidden"
      >
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 dark:from-slate-900/70 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl opacity-0 dark:opacity-100" />
        <div className="pointer-events-none absolute inset-0 ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

        {/* Content */}
        <div className="relative z-10 p-3">
          <div className="space-y-1">
            {views.map((view) => {
              const Icon = view.icon
              const isActive = currentView === view.id
              
              return (
                <button
                  key={view.id}
                  onClick={() => {
                    onViewChange(view.id)
                    onClose()
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-100/90 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Radio indicator */}
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      isActive
                        ? 'border-sky-500 dark:border-sky-400'
                        : 'border-slate-300 dark:border-slate-600'
                    } bg-transparent`}
                  >
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
                    )}
                  </span>
                  <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="flex-1 text-left">{view.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

