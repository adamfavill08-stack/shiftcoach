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
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Settings Panel */}
      <div
        ref={menuRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(24rem,calc(100%-2.5rem))] max-h-[min(34rem,calc(100%-3rem))] rounded-3xl bg-white border border-slate-100 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-slate-900 shadow-[0_4px_10px_rgba(56,189,248,0.35)] border border-sky-100">
              <Settings className="w-3.5 h-3.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Shift calendar settings
              </h2>
              <p className="text-[11px] text-slate-500">
                Control how your rota and coloured shift bars appear.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
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

