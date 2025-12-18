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
    <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-30 flex items-center justify-center" aria-label="Page navigation">
      <div className="flex items-center gap-2">
        {Array.from({ length: pageCount }).map((_, index) => {
          const isActive = index === currentIndex
          const isFirst = index === 0
          
          if (isFirst) {
            // House-shaped button for the first page
            return (
              <button
                key={index}
                type="button"
                onClick={() => onChange(index)}
                className="relative flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="Go to home page"
                aria-current={isActive ? 'page' : undefined}
              >
                <svg
                  width={isActive ? 16 : 14}
                  height={isActive ? 16 : 14}
                  viewBox="0 0 24 24"
                  fill="none"
                  className="transition-all duration-200"
                >
                  {/* House shape: roof triangle + solid base rectangle */}
                  <path
                    d="M3 12L12 3L21 12V20H3V12Z"
                    fill={isActive ? '#0f172a' : '#94a3b8'}
                    fillOpacity={isActive ? 1 : 0.6}
                  />
                </svg>
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-slate-900/10 blur-sm -z-10" />
                )}
              </button>
            )
          }
          
          // Regular circular dots for other pages
          return (
            <button
              key={index}
              type="button"
              onClick={() => onChange(index)}
              className={
                isActive
                  ? 'h-3 w-3 rounded-full bg-slate-900 shadow-sm transition-all duration-200'
                  : 'h-2.5 w-2.5 rounded-full bg-slate-400/60 transition-all duration-200'
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
