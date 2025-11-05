'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function RecoveryPage() {
  // Placeholder score; wire to real value if available
  const recoveryScore: number | null = null
  const value = typeof recoveryScore === 'number' ? recoveryScore : 74
  const band = value >= 75 ? 'high' : value >= 50 ? 'medium' : 'low'

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
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Recovery Score</h1>
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>How ready your body and mind are for your next shift</p>
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
          <span>• Recovery Score shows how ready you are to handle stress, work, and training.</span>
          <span>• It's based on your sleep, shift pattern, activity, and how consistent your schedule is.</span>
          <span>• Higher score = better energy, mood, and resilience on shift.</span>
        </section>

        {/* Hero recovery card */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-6 py-6 flex flex-col items-center gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <p className="text-5xl font-semibold" style={{ color: 'var(--text-main)' }}>{value}</p>
          <span
            className={
              `mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ` +
              (band === 'high'
                ? 'bg-emerald-50 text-emerald-600'
                : band === 'medium'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-rose-50 text-rose-600')
            }
          >
            {band === 'high' ? 'Recovered' : band === 'medium' ? 'OK' : 'Strained'}
          </span>
        </section>

        {/* What is */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🧠</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>What is Recovery Score?</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            Your Recovery Score is a combined view of your sleep, shift pattern, activity and circadian alignment. It tells you how prepared your body and mind are to handle stress, work and training today.
          </p>
        </section>

        {/* Why it matters */}
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
            <li>Irregular shifts make full recovery harder between days and nights.</li>
            <li>Low recovery often shows up as higher fatigue, cravings and lower focus.</li>
            <li>Tracking recovery helps you choose when to push, hold back, or prioritise rest.</li>
          </ul>
        </section>

        {/* How we calculate */}
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
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>How ShiftCali calculates your score</p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>Sleep: hours, quality and how your sleep aligns to your schedule.</li>
            <li>Shifts: number in a row, intensity of times and rotation.</li>
            <li>Activity: daily movement and avoiding overreaching when fatigued.</li>
            <li>Rhythm: how closely your day matches your body clock.</li>
          </ul>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>This is guidance only and not medical advice.</p>
        </section>

        {/* Improve */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💡</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>How to improve your Recovery Score</p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>Protect one main sleep block whenever you can, even on nights.</li>
            <li>Follow meal‑timing nudges to avoid heavy meals during biological night.</li>
            <li>On low‑recovery days, opt for lighter movement and more recovery.
            </li>
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
          <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>See your live Recovery Score</p>
          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Check today's score and guidance on your main dashboard.</p>
          <Link href="/dashboard" className="mt-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200">
            Go to Dashboard
          </Link>
        </section>
      </div>
    </main>
  )
}
