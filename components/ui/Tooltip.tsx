'use client'

import { useEffect, useId, useState } from 'react'

type TooltipProps = {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom'
}

/**
 * Lightweight tooltip component designed for mobile-first apps.
 * - Tap/click on mobile, hover on desktop
 * - Short, high-contrast text
 */
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      // Close if clicking outside any tooltip container
      if (!target.closest('[data-tooltip-root="true"]')) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onClickOutside)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onClickOutside)
    }
  }, [open])

  return (
    <div
      className="relative inline-flex items-center"
      data-tooltip-root="true"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
      >
        {children}
      </button>

      {open && (
        <div
          id={id}
          className={`absolute z-40 max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-lg ${
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-1/2 -translate-x-1/2`}
        >
          {content}
        </div>
      )}
    </div>
  )
}


