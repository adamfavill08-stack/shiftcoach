'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings, X } from 'lucide-react'
import { CalendarSettings } from './CalendarSettings'
import { useTranslation } from '@/components/providers/language-provider'

interface CalendarSettingsMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function CalendarSettingsMenu({ isOpen, onClose }: CalendarSettingsMenuProps) {
  const { t } = useTranslation()
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
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Settings Panel */}
      <div
        ref={menuRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(24rem,calc(100%-2.5rem))] max-h-[min(34rem,calc(100%-3rem))] rounded-3xl border border-slate-200/60 bg-white/95 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/95 dark:shadow-[0_24px_60px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200/80 bg-white/90 dark:border-slate-700/50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/20">
              <Settings className="w-3.5 h-3.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {t('calendar.settingsMenu.title')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('calendar.settingsMenu.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          <CalendarSettings />
        </div>
      </div>
    </>
  )
}

