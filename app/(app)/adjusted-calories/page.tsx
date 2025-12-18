'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTodayNutrition } from '@/lib/hooks/useTodayNutrition'

export default function AdjustedCaloriesPage() {
  const { data, loading } = useTodayNutrition()
  const baseKcal = data?.baseCalories ?? 0
  const adjustedKcal = data?.adjustedCalories ?? 0
  const deltaPct = baseKcal > 0 ? Math.round(((adjustedKcal - baseKcal) / baseKcal) * 100) : 0

  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-1">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }}
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Adjusted Calories</h1>
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Calories tuned to your shifts, sleep and timing</p>
          </div>
        </header>

        {/* Key facts */}
        <section
          className="rounded-2xl backdrop-blur-xl border px-4 py-3 flex flex-col gap-1 text-xs"
          style={{
            backgroundColor: 'var(--card-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-soft)',
          }}
        >
          <span>• Adjusted Calories = your daily target, customised for your shift pattern and sleep.</span>
          <span>• We adapt not just how much you eat, but when it makes sense for your body clock.</span>
          <span>• Built specifically for the realities of shift work.</span>
        </section>

        {/* Hero: today's adjusted target */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-6 py-6 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-soft)' }}>TODAY'S ADJUSTED TARGET</div>
          {loading ? (
            <div className="flex items-baseline gap-2 opacity-60">
              <div className="h-8 w-24 rounded bg-white/10 animate-pulse" />
              <span className="text-sm" style={{ color: 'var(--text-soft)' }}>kcal</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-semibold" style={{ color: 'var(--text-main)' }}>{adjustedKcal.toLocaleString()}</p>
                <span className="text-sm" style={{ color: 'var(--text-soft)' }}>kcal</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-soft)' }}>
                Base: {baseKcal.toLocaleString()} kcal · {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`} for current sleep/shift
              </div>
            </>
          )}
          <div className="inline-flex items-center gap-2 mt-1">
            <span
              className="rounded-full px-3 py-1 text-[11px]"
              style={{
                backgroundColor: 'var(--card-subtle)',
                color: 'var(--text-soft)',
              }}
            >
              Night shift · 2 of 3
            </span>
          </div>
        </section>

        {/* What are Adjusted Calories */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⚖️</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>What are Adjusted Calories?</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            Instead of a fixed calorie number, Shift Coach adjusts your daily target based on your shifts, sleep and recent patterns. On tougher runs of nights or low sleep, we nudge your target and timing so your plan fits real life—not a perfect schedule.
          </p>
        </section>

        {/* Why it matters for shift workers */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌙☀️</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Why it matters for shift workers</p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>Standard calculators assume a 9–5 routine with regular sleep.</li>
            <li>On nights and rotations, hunger and energy don't follow "normal" rules.</li>
            <li>Adjusted Calories respects your schedule, so you're not fighting your body clock.</li>
          </ul>
        </section>

        {/* How we adjust */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📊</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>How Shift Coach adjusts your calories</p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li><span className="font-semibold">Base target:</span> age, weight, height, sex and goal.</li>
            <li><span className="font-semibold">Sleep:</span> short/broken sleep may slightly lower late‑night calories and shift when you eat.</li>
            <li><span className="font-semibold">Shift pattern:</span> days, lates and nights change where we place the bulk of calories.</li>
            <li><span className="font-semibold">Activity:</span> more active days may lift the target; very low activity days stay closer to base.</li>
          </ul>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>This is general guidance only and not medical advice.</p>
        </section>

        {/* Timing focus */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⏰</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Timing: not just how much, but when</p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>On nights, more calories move to pre‑shift and early‑shift meals.</li>
            <li>We keep heavy meals out of your deepest "body night" hours when possible.</li>
            <li>On recovery days, we gently steer eating back towards a daytime pattern.</li>
          </ul>
        </section>

        {/* CTA */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-4 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>See today's Adjusted Calories</p>
          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Check your live target and suggested timing on your dashboard.</p>
          <Link href="/dashboard" className="mt-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200">
            Go to Dashboard
          </Link>
        </section>

        {/* Disclaimer */}
        <div className="pt-4 pb-4">
          <p className="text-[11px] leading-relaxed text-slate-500 text-center">
            Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or complex health issues, please check your plan with a registered professional.
          </p>
        </div>
      </div>
    </main>
  )
}
