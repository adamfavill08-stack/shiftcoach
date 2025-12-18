"use client"

import { useMemo, useState } from 'react'
import { Smile, Brain, Info } from 'lucide-react'

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
      className={[
        "relative overflow-hidden rounded-[28px]",
        "bg-white/90 backdrop-blur-2xl",
        "border border-white/90",
        "shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)]",
        "px-7 py-6",
        "flex flex-col gap-5",
      ].join(" ")}
    >
      {/* Ultra-premium gradient overlay with multiple layers */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/85 to-white/70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20" />
      
      {/* Enhanced inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/60" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[27px] ring-1 ring-white/30" />
      
      {/* Ambient glow effect */}
      <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-purple-100/20 to-transparent blur-xl opacity-50" />
      
      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                Mood & Focus
              </h2>
              <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">
                Today
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
            Use the sliders to log how you feel right now. Low scores tell ShiftCoach to protect your sleep, simplify your day and adjust your plan around tougher shifts.
          </p>
        </div>
        
        {/* Sliders */}
        <div className="space-y-4">
          <SliderRow label="Mood" iconType="mood" value={mood} onChange={v => onChange?.(v, focus)} onInfo={()=>setActiveInfo('mood')} />
          <SliderRow label="Focus" iconType="focus" value={focus} onChange={v => onChange?.(mood, v)} onInfo={()=>setActiveInfo('focus')} />
        </div>
      </div>

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
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 border border-sky-200/60 shadow-sm">
                        {activeInfo === 'mood' ? (
                          <Smile className="h-5 w-5 text-sky-600" strokeWidth={2} />
                        ) : (
                          <Brain className="h-5 w-5 text-indigo-600" strokeWidth={2} />
                        )}
                      </div>
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
                  <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>Shift Coach is here to support you, but this isn't a crisis service. If you feel at risk, please contact local emergency or mental health services.</p>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </section>
  )
}

function SliderRow({ label, iconType, value, onChange, onInfo }: { label: string; iconType: 'mood' | 'focus'; value: number; onChange: (v: number) => void; onInfo: ()=>void }) {
  const percentage = ((value - 1) / 4) * 100 // Scale 1-5 to 0-100%

  return (
    <div className="flex items-center gap-4 transition-all">
      {/* Left */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 shadow-sm">
          {iconType === 'mood' ? (
            <Smile className="h-5 w-5 text-slate-700" strokeWidth={2.5} />
          ) : (
            <Brain className="h-5 w-5 text-slate-700" strokeWidth={2.5} />
          )}
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-slate-900">{label}</span>
      </div>

      {/* Center – slider */}
      <div className="flex-1 min-w-0">
        <div className="relative h-3">
          {/* Track background */}
          <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-slate-100/90 to-slate-100/60 overflow-hidden border border-slate-200/50 shadow-inner">
            {/* Filled gradient */}
            <div 
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-400 transition-all duration-200 shadow-[0_2px_4px_rgba(139,92,246,0.3)]" 
              style={{ width: `${percentage}%` }}
            >
              {/* Gradient shine overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>

          {/* Invisible but functional range */}
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-4 -top-0.5 cursor-pointer z-20 opacity-0 outline-none"
            style={{ WebkitAppearance: 'none', appearance: 'none', background: 'transparent' }}
          />

          {/* Premium thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white bg-gradient-to-br from-sky-400 to-indigo-500 shadow-[0_0_0_4px_rgba(56,189,248,0.25),0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-150 pointer-events-none z-30"
            style={{ left: `calc(${percentage}% - 10px)` }}
          >
            {/* Thumb inner glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent" />
          </div>
        </div>
        {/* Optional low/high labels */}
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 font-medium">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Right – score pill + info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 shadow-sm text-slate-700"
        >
          {value}/5
        </span>
        <button
          type="button"
          onClick={onInfo}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 shadow-sm text-slate-500 hover:text-slate-700 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200/60 transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label={`${label} help`}
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
