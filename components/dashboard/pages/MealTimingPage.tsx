'use client'

import { ChevronRight, UtensilsCrossed } from 'lucide-react'
import { MealTimingSummary } from '../types'

interface MealTimingPageProps {
  summary: MealTimingSummary
}

export function MealTimingPage({ summary }: MealTimingPageProps) {
  return (
    <div className="flex h-full flex-col rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-900/60 p-6 text-slate-50 shadow-[0_20px_50px_rgba(10,16,28,0.45)]">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Meal timing coach</h2>
          <p className="text-xs text-slate-400">Dial in pre & post shift slots</p>
        </div>
        <UtensilsCrossed className="h-5 w-5 text-slate-400" />
      </header>

      <div className="mt-4 rounded-2xl bg-white/10 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Today&apos;s shift</p>
        <div className="mt-1 text-lg font-semibold capitalize">
          {summary.shiftType || 'Off shift'}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {summary.recommended.length ? (
          summary.recommended.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{meal.label}</p>
                <p className="text-xs text-slate-300">Ideal around {meal.suggestedTime}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-300">
            Log a rota and a few meals to start seeing personalised timing windows.
          </p>
        )}
      </div>

    </div>
  )
}
