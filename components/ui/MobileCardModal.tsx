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
      className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-[calc(100%-24px)] max-w-[420px] sm:max-w-[480px] rounded-3xl bg-white shadow-2xl
                   overflow-hidden translate-y-0 sm:translate-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>

        {footer ? (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">{footer}</div>
        ) : null}
      </div>
    </div>,
    container
  )
}

