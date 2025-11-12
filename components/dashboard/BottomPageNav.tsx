'use client'

import React from 'react'

type BottomPageNavProps = {
  pageCount: number
  currentIndex: number
  onChange: (index: number) => void
}

export function BottomPageNav({ pageCount, currentIndex, onChange }: BottomPageNavProps) {
  if (pageCount <= 1) return null

  return (
    <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-30 flex items-center gap-4" aria-label="Page navigation">
      <button
        type="button"
        className="flex flex-col gap-1 cursor-pointer select-none"
        aria-label="Open main menu"
      >
        <span className="h-[2px] w-5 rounded-full bg-slate-500" />
        <span className="h-[2px] w-5 rounded-full bg-slate-500" />
      </button>

      <div className="flex items-center gap-2">
        {Array.from({ length: pageCount }).map((_, index) => {
          const isActive = index === currentIndex
          return (
            <button
              key={index}
              type="button"
              onClick={() => onChange(index)}
              className={
                isActive
                  ? 'h-3 w-3 rounded-full bg-slate-900 shadow-sm'
                  : 'h-2.5 w-2.5 rounded-full bg-slate-400/60'
              }
              aria-label={`Go to page ${index + 1}`}
              aria-current={isActive ? 'page' : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
