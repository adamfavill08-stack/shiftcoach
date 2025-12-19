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
  const [hasInteracted, setHasInteracted] = useState({ mood: false, focus: false })
  const isLow = useMemo(() => (mood <= 2 || focus <= 2), [mood, focus])
  // Signal header to light bell
  useMemo(() => { try { localStorage.setItem('mf-low', isLow ? '1' : '0') } catch {} }, [isLow])
  
  const handleMoodChange = (v: number) => {
    setHasInteracted(prev => ({ ...prev, mood: true }))
    onChange?.(v, focus)
  }
  
  const handleFocusChange = (v: number) => {
    setHasInteracted(prev => ({ ...prev, focus: true }))
    onChange?.(mood, v)
  }
  
  return (
    <section
      className={[
        "relative rounded-3xl",
        "bg-white/80 backdrop-blur-xl",
        "border border-slate-200/50",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)]",
        "p-6",
      ].join(" ")}
    >
      {/* Optional highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/60 via-transparent to-transparent" />
      
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">
            Mood & Focus
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Today
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 max-w-prose">
            Log how you feel right now. Lower scores help ShiftCoach protect your sleep,
            simplify your day, and adapt your plan around tougher shifts.
          </p>
        </div>
        
        {/* Sliders */}
        <div className="space-y-4">
          <SliderRow 
            label="Mood" 
            iconType="mood" 
            value={mood} 
            onChange={handleMoodChange} 
            onInfo={()=>setActiveInfo('mood')}
            hasInteracted={hasInteracted.mood}
          />
          <SliderRow 
            label="Focus" 
            iconType="focus" 
            value={focus} 
            onChange={handleFocusChange} 
            onInfo={()=>setActiveInfo('focus')}
            hasInteracted={hasInteracted.focus}
          />
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

function SliderRow({ 
  label, 
  iconType, 
  value, 
  onChange, 
  onInfo,
  hasInteracted 
}: { 
  label: string
  iconType: 'mood' | 'focus'
  value: number
  onChange: (v: number) => void
  onInfo: ()=>void
  hasInteracted: boolean
}) {
  const percentage = ((value - 1) / 4) * 100 // Scale 1-5 to 0-100%
  
  const getContextualMessage = () => {
    if (!hasInteracted) return null
    if (label === 'Focus' && value <= 2) {
      return 'Low focus days trigger lighter cognitive loads.'
    }
    if (label === 'Mood' && value <= 2) {
      return 'Lower mood signals the need for gentler planning.'
    }
    return null
  }

  return (
    <div className="rounded-2xl bg-slate-50/50 border border-slate-200/40 px-4 py-4">
      <div className="flex items-center gap-4">
        {/* Left – icon */}
        <div className="flex-shrink-0">
          <div className="h-9 w-9 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center">
            {iconType === 'mood' ? (
              <Smile className="h-4 w-4 text-slate-400" strokeWidth={2} />
            ) : (
              <Brain className="h-4 w-4 text-slate-400" strokeWidth={2} />
            )}
          </div>
        </div>

        {/* Center – label and slider */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/70 border border-slate-200/60 px-2.5 py-1 text-xs font-medium text-slate-700 tabular-nums">
                {value} / 5
              </span>
              <button
                type="button"
                onClick={onInfo}
                className="h-8 w-8 rounded-full bg-transparent text-slate-400 hover:bg-slate-100/60 transition-colors flex items-center justify-center"
                aria-label={`${label} help`}
              >
                <Info className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          
          {/* Slider */}
          <div className="relative">
            <div className="relative h-2 rounded-full bg-slate-200/60">
              {/* Filled track */}
              <div 
                className="h-full rounded-full bg-gradient-to-r from-indigo-400/80 to-violet-500/80 transition-all duration-200" 
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            {/* Invisible but functional range input */}
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="absolute inset-0 w-full h-2 cursor-pointer z-10 opacity-0 outline-none"
              style={{ WebkitAppearance: 'none', appearance: 'none', background: 'transparent' }}
            />

            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white border border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-150 pointer-events-none z-20"
              style={{ left: `calc(${percentage}% - 10px)` }}
            />
          </div>
          
          {/* Low / High labels */}
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Low</span>
            <span>High</span>
          </div>
          
          {/* Contextual micro-copy */}
          {getContextualMessage() && (
            <p className="mt-2 text-xs text-slate-500">
              {getContextualMessage()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
