'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function MobileCardModal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.getElementById('phone-root')
    setContainer(el ?? document.body)
  }, [])

  if (!open || !container) return null

  return createPortal(
    <div
      className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-[calc(100%-24px)] max-w-[420px] sm:max-w-[480px] rounded-3xl bg-white dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-2xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]
                   overflow-hidden translate-y-0 sm:translate-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/40 bg-gradient-to-b from-white dark:from-slate-900/70 to-slate-50/50 dark:to-slate-900/50">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900/95">{children}</div>

        {footer ? (
          <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-900/50">{footer}</div>
        ) : null}
      </div>
    </div>,
    container
  )
}

