'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'

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
  const { t } = useTranslation()
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
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card)] backdrop-blur-2xl shadow-[0_24px_60px_rgba(15,23,42,0.25)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--card)] via-[var(--card)] to-[var(--card-subtle)]" />
          
          {/* Inner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[var(--border-subtle)]" />
          
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-300/60 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-950/35">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-300" strokeWidth={2.5} />
                </div>
                <h3 className="text-[17px] font-bold tracking-tight text-slate-900">
                  {t('sleepDel.title')}
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--card-subtle)] text-[var(--text-soft)] transition-all hover:scale-105 hover:bg-[var(--card-subtle)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t('sleepDel.closeAria')}
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Message */}
            <p className="mb-6 text-[13px] leading-relaxed text-[var(--text-soft)]">
              {t('sleepDel.body')}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text-soft)] transition-all hover:scale-[1.02] hover:bg-[var(--card)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('sleepDel.cancel')}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-[13px] font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>{t('sleepDel.deleting')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                    <span>{t('sleepDel.confirm')}</span>
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

