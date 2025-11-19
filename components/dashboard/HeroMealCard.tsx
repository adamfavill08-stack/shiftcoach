'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { useHeroMeal } from '@/lib/hooks/useHeroMeal'

function formatLocalTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function HeroMealCard() {
  const { heroMeal, imageUrl, loading } = useHeroMeal()
  const fallbackImage = '/images/shiftcali-hero-meal.jpg'

  const timeLabel = useMemo(() => heroMeal ? formatLocalTime(heroMeal.suggestedTime) : '--:--', [heroMeal])

  if (loading) {
    return (
      <section className="rounded-3xl border backdrop-blur-2xl overflow-hidden animate-pulse" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-subtle)' }}>
        <div className="h-40 w-full bg-slate-200/40 dark:bg-slate-700/40" />
        <div className="p-4 space-y-3">
          <div className="h-6 w-1/3 bg-slate-200/60 dark:bg-slate-700/60 rounded-full" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-12 rounded-2xl bg-slate-200/50 dark:bg-slate-700/50" />
            <div className="h-12 rounded-2xl bg-slate-200/50 dark:bg-slate-700/50" />
            <div className="h-12 rounded-2xl bg-slate-200/50 dark:bg-slate-700/50" />
          </div>
          <div className="h-3 rounded-full bg-slate-200/50 dark:bg-slate-700/50" />
        </div>
      </section>
    )
  }

  if (!heroMeal) return null

  const kcal = heroMeal.calories
  const protein = heroMeal.protein_g ?? 0
  const carbs = heroMeal.carbs_g ?? 0
  const fats = heroMeal.fat_g ?? 0
  const healthPct = Math.max(0, Math.min(1, heroMeal.healthScore / 10))

  return (
    <section
      className="rounded-3xl border backdrop-blur-2xl overflow-hidden cursor-pointer"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-soft)' }}
      onClick={() => {/* future: navigate to meal details */}}
    >
      {/* Image header */}
      <div className="relative h-48 w-full overflow-hidden rounded-t-3xl">
        <Image
          src={fallbackImage}
          alt={heroMeal?.label ?? 'Healthy Shift Coach meal'}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 400px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center rounded-full bg-black/40 px-3 py-0.5 text-[11px] text-white/80 backdrop-blur">
              {timeLabel || '12:30 PM'}
            </span>
            <h3 className="mt-1 text-lg font-semibold text-white leading-tight">
              {heroMeal.label || 'Shift Coach Power Bowl'}
            </h3>
          </div>
          <button
            className="h-8 w-8 rounded-full grid place-items-center text-white/90 border border-white/30 backdrop-blur-md"
            aria-label="Bookmark"
          >
            ★
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        {/* Portion selector row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs" style={{ color: 'var(--text-soft)' }}>Portion</span>
          <button className="px-3 py-1 rounded-full text-xs border" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}>
            1 ✎
          </button>
        </div>

        {/* Stats chips */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-2xl border px-3 py-2 flex flex-col items-start" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--card-subtle)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Calories</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{kcal}</span>
          </div>
          <div className="rounded-2xl border px-3 py-2 flex flex-col items-start" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--card-subtle)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Protein</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{protein}g</span>
          </div>
          <div className="rounded-2xl border px-3 py-2 flex flex-col items-start" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--card-subtle)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Carbs</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{carbs}g</span>
          </div>
          <div className="rounded-2xl border px-3 py-2 flex flex-col items-start col-span-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--card-subtle)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Fats</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{fats}g</span>
          </div>
        </div>

        {/* Health score */}
        <div className="flex items-center justify-between mb-1">
          <div className="inline-flex items-center gap-2">
            <span>❤</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Health Score</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{heroMeal.healthScore}/10</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ring-bg)' }}>
          <div className="h-full" style={{ width: `${healthPct*100}%`, backgroundImage: 'linear-gradient(90deg,#10b981,#22c55e)' }} />
        </div>
      </div>
    </section>
  )
}


