'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings, X } from 'lucide-react'
import { CalendarSettings } from './CalendarSettings'

interface CalendarSettingsMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function CalendarSettingsMenu({ isOpen, onClose }: CalendarSettingsMenuProps) {
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Settings Panel */}
      <div
        ref={menuRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(24rem,calc(100%-2.5rem))] max-h-[min(34rem,calc(100%-3rem))] rounded-3xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-[0_24px_70px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
      >
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 dark:from-slate-900/70 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl opacity-0 dark:opacity-100" />
        <div className="pointer-events-none absolute inset-0 ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900">
              <Settings className="w-3.5 h-3.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                Shift calendar settings
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Control how your rota and coloured shift bars appear.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6">
          <CalendarSettings />
        </div>
      </div>
    </>
  )
}

