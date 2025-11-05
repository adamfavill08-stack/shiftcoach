"use client"

import { useMemo, useState } from 'react'

type InfoKind = 'mood' | 'focus'

function getMoodMessage(score: number) {
  if (score <= 1) return { title: 'Mood is really low today', body: [
    'Today looks tough. Be kind to yourself – sleep, food and stress all hit harder on shifts.',
    'If you can, keep your plan light and simple. Short walks, easy meals, and small wins only.',
    'Chat with the AI Coach if you’d like support right now.',
  ]}
  if (score === 2) return { title: 'Not your best day', body: [
    'Your mood is a bit low. That’s completely normal, especially around nights and quick turnarounds.',
    'Focus on basics: regular meals, hydration, and a short break away from bright screens.',
  ]}
  if (score === 3) return { title: 'Steady but tired', body: [
    'You’re doing okay, but there’s room to feel better.',
    'Try one small upgrade today – a 10 minute daylight walk or a proper meal before shift.',
  ]}
  if (score === 4) return { title: 'Good mood, nice work', body: [
    'You’re in a good place today. Use it to lock in habits that help future shifts too.',
  ]}
  return { title: 'Excellent mood', body: [
    'You’re feeling great – amazing.',
    'This is a perfect time to bank some healthy routines for the tougher days.',
  ]}
}

function getFocusMessage(score: number) {
  if (score <= 1) return { title: 'Focus is very low', body: [
    'Concentration is really struggling. That can happen with broken sleep or long runs of shifts.',
    'Prioritise safety and simple tasks where you can. Avoid big decisions if possible.',
    'Talking with the AI Coach can help you plan micro-breaks and smarter caffeine timing.',
  ]}
  if (score === 2) return { title: 'Focus is below usual', body: [
    'You’re not as sharp as usual today. That’s your body asking for recovery.',
    'Use short breaks, movement and steady meals to keep you going.',
  ]}
  if (score === 3) return { title: 'Focus is okay', body: [
    'You’re managing fine, but not at 100%.',
    'Try to protect your next sleep window – it will help tomorrow’s focus a lot.',
  ]}
  if (score === 4) return { title: 'Focused and on it', body: [
    'You’re concentrating well today. Great time for important tasks or training.',
  ]}
  return { title: 'Super sharp', body: [
    'Your focus is excellent. Just remember not to overdo caffeine late in your body night.',
  ]}
}

export function MoodFocus({
  mood=3, focus=3, onChange
}:{ mood?:number; focus?:number; onChange?:(m:number,f:number)=>void }) {
  const [activeInfo, setActiveInfo] = useState<InfoKind | null>(null)
  const isLow = useMemo(() => (mood <= 2 || focus <= 2), [mood, focus])
  // Signal header to light bell
  useMemo(() => { try { localStorage.setItem('mf-low', isLow ? '1' : '0') } catch {} }, [isLow])
  return (
    <section
      className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Mood & Focus</p>
        <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Today</p>
      </div>
      <SliderRow label="Mood" emoji="🙂" value={mood} onChange={v => onChange?.(v, focus)} onInfo={()=>setActiveInfo('mood')} />
      <SliderRow label="Focus" emoji="🎯" value={focus} onChange={v => onChange?.(mood, v)} onInfo={()=>setActiveInfo('focus')} />

      {activeInfo && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center md:items-center backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={()=>setActiveInfo(null)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl md:rounded-3xl backdrop-blur-2xl border px-5 pt-4 pb-5 animate-slide-up"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-soft)',
            }}
            onClick={(e)=>e.stopPropagation()}
          >
            {(() => {
              const score = activeInfo === 'mood' ? mood : focus
              const content = activeInfo === 'mood' ? getMoodMessage(score) : getFocusMessage(score)
              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{activeInfo === 'mood' ? '😊' : '🎯'}</span>
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{content.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-soft)' }}>{activeInfo === 'mood' ? 'Mood' : 'Focus'} · {score}/5 today</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={()=>setActiveInfo(null)}
                      className="text-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {content.body.map((line, idx) => (
                      <p key={idx} className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>{line}</p>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem(
                          'coach-context',
                          JSON.stringify({
                            reason: activeInfo === 'mood' ? 'low_mood' : 'low_focus',
                            score,
                          })
                        )
                      } catch {}
                      setActiveInfo(null)
                      // Trigger coach chat to open
                      window.dispatchEvent(new CustomEvent('open-coach-chat'))
                    }}
                    className="mt-3 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white hover:brightness-110 active:scale-95 transition"
                  >
                    Talk to AI Coach
                  </button>
                  <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>ShiftCali is here to support you, but this isn't a crisis service. If you feel at risk, please contact local emergency or mental health services.</p>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </section>
  )
}

function SliderRow({ label, emoji, value, onChange, onInfo }: { label: string; emoji: string; value: number; onChange: (v: number) => void; onInfo: ()=>void }) {
  const percentage = ((value - 1) / 4) * 100 // Scale 1-5 to 0-100%

  return (
    <div className="flex items-center gap-3 transition-all">
      {/* Left */}
      <div className="w-[26%] flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{label}</span>
      </div>

      {/* Center – slider */}
      <div className="flex-1">
        <div className="relative h-2">
          {/* Track background */}
          <div
            className="absolute inset-0 h-2 w-full rounded-full"
            style={{ backgroundColor: 'var(--ring-bg)' }}
          >
            {/* Filled gradient */}
            <div className="h-2 rounded-full bg-gradient-to-r from-[#ec5fff] via-[#a855f7] to-[#22d3ee] transition-all duration-200" style={{ width: `${percentage}%` }} />
          </div>

          {/* Invisible but functional range */}
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-4 -top-1 cursor-pointer z-20 opacity-0 outline-none"
            style={{ WebkitAppearance: 'none', appearance: 'none', background: 'transparent' }}
          />

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,0.25)] transition-all duration-150 pointer-events-none z-30"
            style={{ left: `calc(${percentage}% - 8px)` }}
          />
        </div>
        {/* Optional low/high labels */}
        <div className="flex justify-between mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Right – score pill + info */}
      <div className="w-[22%] flex items-center justify-end gap-1">
        <span
          className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium"
          style={{
            backgroundColor: 'var(--card-subtle)',
            color: 'var(--text-soft)',
          }}
        >
          {value}/5
        </span>
        <button
          type="button"
          onClick={onInfo}
          className="h-6 w-6 flex items-center justify-center rounded-full text-[11px] transition"
          style={{
            backgroundColor: 'var(--card-subtle)',
            color: 'var(--text-soft)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--ring-bg)'
            e.currentTarget.style.color = 'var(--text-main)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
            e.currentTarget.style.color = 'var(--text-soft)'
          }}
          aria-label={`${label} help`}
        >
          i
        </button>
      </div>
    </div>
  )
}
