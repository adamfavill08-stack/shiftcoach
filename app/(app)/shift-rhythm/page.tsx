'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function ShiftRhythmPage() {
  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-2">
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
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Shift Rhythm</h1>
        </header>

        {/* Key facts strip */}
        <div
          className="rounded-2xl backdrop-blur-xl border px-4 py-3 flex flex-col gap-1 text-xs"
          style={{
            backgroundColor: 'var(--card-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-soft)',
          }}
        >
          <span>• Shift Rhythm = your circadian sync score.</span>
          <span>• Higher score = better energy, mood, and recovery.</span>
          <span>• Designed for the realities of shift work.</span>
        </div>

        {/* What is */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>What is Shift Rhythm™?</h2>
          </div>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-main)' }}>
            Shift Rhythm™ is your <span className="font-semibold">circadian sync score</span>. It shows how well your sleep,
            light exposure and shift pattern line up with what your body clock expects – especially when you work nights,
            lates or rotating shifts.
          </p>
        </section>

        {/* Circadian explainer */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">⏱️</span>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Your body clock (circadian rhythm)</h3>
          </div>
          <p className="text-base" style={{ color: 'var(--text-main)' }}>
            Inside your brain is a 24-hour clock that controls energy, hunger, hormones and body temperature. It loves
            <span className="font-semibold"> regular light, meals and sleep</span>.
          </p>
          <p className="text-base" style={{ color: 'var(--text-main)' }}>
            When you work shifts, that clock is constantly being dragged forwards and backwards – nights, early starts, days off.
            If the clock never settles, you feel it as <span className="font-semibold">tiredness, cravings, brain fog and mood swings</span>.
          </p>
        </section>

        {/* Score ranges */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>How the score works</h3>
          </div>
          <ul className="text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>
              <span className="font-semibold text-emerald-600">80–100 · In rhythm</span><br />
              Sleep is close to your goal, bedtimes are fairly regular and your shifts are supported with good timing of meals, naps and caffeine.
            </li>
            <li>
              <span className="font-semibold text-amber-600">50–79 · Wobbly rhythm</span><br />
              Some nights are short, bedtimes jump around or meals/caffeine are landing late in your "biological night". You're coping, but recovery isn't ideal.
            </li>
            <li>
              <span className="font-semibold text-rose-600">0–49 · Out of sync</span><br />
              Big swings in sleep times, frequent short sleeps or rapid flips between day and night shifts. This is when cravings, belly fat and low mood hit hardest.
            </li>
          </ul>
        </section>

        {/* What ShiftCali looks at */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>What ShiftCali tracks to calculate it</h3>
          </div>
          <ul className="text-sm list-disc pl-5 space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li><span className="font-semibold">Sleep length &amp; timing</span> – how many hours you get and what time your main sleep starts.</li>
            <li><span className="font-semibold">Regularity</span> – how much your bed and wake times jump around across the week.</li>
            <li><span className="font-semibold">Shift pattern</span> – day vs night shifts, quick turnarounds and flip-flops.</li>
            <li><span className="font-semibold">Recovery quality</span> – your sleep quality ratings and nap use.</li>
          </ul>
        </section>

        {/* How to improve */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🌙</span>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>How to improve your score</h3>
          </div>
          <ul className="text-sm list-disc pl-5 space-y-2" style={{ color: 'var(--text-main)' }}>
            <li>
              <span className="font-semibold">Anchor one sleep window.</span> Even on days off, keep your main sleep within a 1–2 hour window where possible.
            </li>
            <li>
              <span className="font-semibold">Protect post-night sleep.</span> Dark room, eye mask, cool temperature and phone away – treat it like a night's sleep, not a nap.
            </li>
            <li>
              <span className="font-semibold">Use caffeine early, not late.</span> ShiftCali shows your caffeine cut-off. Try to keep most caffeine in the first half of your shift.
            </li>
            <li>
              <span className="font-semibold">Time meals around your shift rhythm.</span> Steady protein-based meals in your alert window, lighter snacks near "biological night".
            </li>
          </ul>
          <p className="text-sm" style={{ color: 'var(--text-main)' }}>
            You don't need a perfect score. For most shift workers, keeping Shift Rhythm™ above <span className="font-semibold">70+</span> is enough to feel more stable, reduce binge eating and protect long-term health.
          </p>
        </section>

        {/* CTA */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-4 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>See your current Shift Rhythm</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-soft)' }}>Check today's score and guidance on your dashboard.</p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 text-white px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 hover:opacity-95"
          >
            Go to Dashboard
          </Link>
        </section>
      </div>
    </main>
  )
}
