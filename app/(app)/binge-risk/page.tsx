'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function BingeRiskPage() {
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
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>Binge Risk</h1>
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
          <span>• Binge Risk estimates how likely you are to overeat based on sleep, shifts and recent habits.</span>
          <span>• Low = stable. Medium = watch your triggers. High = extra support & planning.</span>
        </div>

        {/* What it is */}
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
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>What is binge risk?</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            Binge Risk in Shift Coach is an estimate of how likely you are to have
            <span className="font-semibold"> big cravings, mindless snacking or a full-on binge</span>
            in the next day or two, based on your sleep, shift pattern and recent habits.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            Shift workers are hit harder because tired brains crave quick energy –
            <span className="font-semibold"> sugar, fat and huge portions</span> – especially after nights,
            early starts and long commutes.
          </p>
        </section>

        {/* Colour scale */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🧩</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>What the colours mean</p>
          </div>
          <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-main)' }}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <p className="font-medium" style={{ color: 'var(--text-main)' }}>Low</p>
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Balanced, stable pattern.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <p className="font-medium" style={{ color: 'var(--text-main)' }}>Medium</p>
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Some red flags – be extra intentional with meals, sleep and caffeine.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <p className="font-medium" style={{ color: 'var(--text-main)' }}>High</p>
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Your body is running on fumes – plan support and recovery now.</p>
            </div>
          </div>
        </section>

        {/* Why shift workers struggle */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🤍</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Why shift workers binge more</p>
          </div>
          <ul className="text-sm list-disc list-inside space-y-1" style={{ color: 'var(--text-main)' }}>
            <li><span className="font-semibold">Sleep debt:</span> less sleep = more hunger hormone (ghrelin) and less "I'm full" signal (leptin).</li>
            <li><span className="font-semibold">Circadian mismatch:</span> eating at 3–4am when your body expects sleep makes you crave junk and store more fat.</li>
            <li><span className="font-semibold">Stress &amp; emotion:</span> long, busy shifts with no breaks make food the easiest reward.</li>
            <li><span className="font-semibold">Environment:</span> vending machines, takeaways and energy drinks are always available on nights.</li>
          </ul>
        </section>

        {/* How Shift Coach helps */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📋</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>How Shift Coach helps you combat it</p>
          </div>
          <ul className="text-sm list-disc list-inside space-y-2" style={{ color: 'var(--text-main)' }}>
            <li><span className="font-semibold">Keeps sleep on track:</span> the app nudges you towards enough sleep and better timing for your shifts.</li>
            <li><span className="font-semibold">Times meals for your rota:</span> Smart Shift Meal Prep plans protein-focused meals when you're most alert.</li>
            <li><span className="font-semibold">Flags danger windows:</span> high-risk nights show up on your dashboard so you can plan ahead.</li>
            <li><span className="font-semibold">Encourages steady fuel:</span> instead of starving then binging, you get small, regular meal suggestions.</li>
          </ul>
        </section>

        {/* Practical tips */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌿</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Quick actions when risk is Medium or High</p>
          </div>
          <ul className="text-sm list-disc list-inside space-y-2" style={{ color: 'var(--text-main)' }}>
            <li>Eat a <span className="font-semibold">planned snack</span> (protein + fibre) before you get home from a long or night shift.</li>
            <li>Set a <span className="font-semibold">"kitchen closed" time</span> so you don't default to grazing late at night.</li>
            <li>Use a <span className="font-semibold">non-food reward</span> after work: shower, music, short walk, call someone, game, etc.</li>
            <li>On days off, prioritise <span className="font-semibold">one solid sleep</span> instead of lots of tiny naps.</li>
          </ul>
          <p className="text-sm" style={{ color: 'var(--text-main)' }}>
            The goal isn't to be perfect – it's to stack the odds in your favour so binges become <span className="font-semibold">rare slips</span>, not your normal pattern.
          </p>
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
          <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>See your current Binge Risk</p>
          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Check your live score and personalised suggestions on your dashboard.</p>
          <Link href="/dashboard" className="mt-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 active:scale-95">
            Go to Dashboard
          </Link>
        </section>
      </div>
    </main>
  )
}
