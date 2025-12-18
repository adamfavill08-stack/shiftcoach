'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'

type DeleteSleepConfirmModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export function DeleteSleepConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: DeleteSleepConfirmModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    if (open) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      // Store original padding-right if it exists (for scrollbar compensation)
      const originalPaddingRight = document.body.style.paddingRight
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
      
      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
      }
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [open, mounted])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="relative overflow-hidden rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/80" />
          
          {/* Inner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/60" />
          
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 border border-rose-200/60">
                  <AlertTriangle className="h-5 w-5 text-rose-600" strokeWidth={2.5} />
                </div>
                <h3 className="text-[17px] font-bold tracking-tight text-slate-900">
                  Delete sleep entry?
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Message */}
            <p className="text-[13px] text-slate-600 leading-relaxed mb-6">
              This will remove this sleep log and update your sleep and Shift Rhythm calculations.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-[13px] font-semibold text-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-[13px] font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

