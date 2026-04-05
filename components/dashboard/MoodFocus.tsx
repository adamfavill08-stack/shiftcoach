"use client"

import { useMemo, useState } from 'react'
import { Smile, Brain, Info } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { parseMoodFocusBody } from '@/lib/i18n/moodFocus'

type InfoKind = 'mood' | 'focus'

function scoreBucket(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score <= 1) return 1
  if (score === 2) return 2
  if (score === 3) return 3
  if (score === 4) return 4
  return 5
}

export function MoodFocus({
  mood = 3,
  focus = 3,
  onChange,
}: {
  mood?: number
  focus?: number
  onChange?: (m: number, f: number) => void
}) {
  const { t } = useTranslation()
  const [activeInfo, setActiveInfo] = useState<InfoKind | null>(null)
  const [hasInteracted, setHasInteracted] = useState({ mood: false, focus: false })
  const isLow = useMemo(() => mood <= 2 || focus <= 2, [mood, focus])
  useMemo(() => {
    try {
      localStorage.setItem('mf-low', isLow ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [isLow])

  const moodLabel = t('dashboard.moodFocus.moodLabel')
  const focusLabel = t('dashboard.moodFocus.focusLabel')

  const handleMoodChange = (v: number) => {
    setHasInteracted((prev) => ({ ...prev, mood: true }))
    onChange?.(v, focus)
  }

  const handleFocusChange = (v: number) => {
    setHasInteracted((prev) => ({ ...prev, focus: true }))
    onChange?.(mood, v)
  }

  return (
    <section
      className={[
        'relative rounded-3xl',
        'bg-white/80 dark:bg-slate-900/45 backdrop-blur-xl',
        'border border-slate-200/50 dark:border-slate-700/40',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
        'p-6',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/60 dark:from-slate-900/50 via-transparent to-transparent" />

      <div className="relative z-10 space-y-6">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t('dashboard.moodFocus.title')}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('dashboard.moodFocus.today')}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 max-w-prose">
            {t('dashboard.moodFocus.intro')}
          </p>
        </div>

        <div className="space-y-4">
          <SliderRow
            label={moodLabel}
            iconType="mood"
            value={mood}
            onChange={handleMoodChange}
            onInfo={() => setActiveInfo('mood')}
            hasInteracted={hasInteracted.mood}
            t={t}
          />
          <SliderRow
            label={focusLabel}
            iconType="focus"
            value={focus}
            onChange={handleFocusChange}
            onInfo={() => setActiveInfo('focus')}
            hasInteracted={hasInteracted.focus}
            t={t}
          />
        </div>
      </div>

      {activeInfo && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center md:items-center backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setActiveInfo(null)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl md:rounded-3xl backdrop-blur-2xl border px-5 pt-4 pb-5 animate-slide-up"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-soft)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const score = activeInfo === 'mood' ? mood : focus
              const b = scoreBucket(score)
              const prefix = activeInfo === 'mood' ? 'dashboard.moodFocus.mood' : 'dashboard.moodFocus.focus'
              const title = t(`${prefix}.b${b}.title`)
              const body = parseMoodFocusBody(t(`${prefix}.b${b}.body`))
              const kindLabel = activeInfo === 'mood' ? moodLabel : focusLabel
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
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                          {title}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                          {t('dashboard.moodFocus.scoreCaption', { kind: kindLabel, score })}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveInfo(null)}
                      className="text-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-main)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {body.map((line, idx) => (
                      <p key={idx} className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
                        {line}
                      </p>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {t('dashboard.moodFocus.disclaimer')}
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </section>
  )
}

type TFn = (key: string, params?: Record<string, string | number | undefined>) => string

function SliderRow({
  label,
  iconType,
  value,
  onChange,
  onInfo,
  hasInteracted,
  t,
}: {
  label: string
  iconType: 'mood' | 'focus'
  value: number
  onChange: (v: number) => void
  onInfo: () => void
  hasInteracted: boolean
  t: TFn
}) {
  const percentage = ((value - 1) / 4) * 100

  const contextualMessage = (() => {
    if (!hasInteracted) return null
    if (iconType === 'focus' && value <= 2) return t('dashboard.moodFocus.hintFocusLow')
    if (iconType === 'mood' && value <= 2) return t('dashboard.moodFocus.hintMoodLow')
    return null
  })()

  return (
    <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-800/35 border border-slate-200/40 dark:border-slate-700/30 px-4 py-4">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 flex items-center justify-center">
            {iconType === 'mood' ? (
              <Smile className="h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
            ) : (
              <Brain className="h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                {value} / 5
              </span>
              <button
                type="button"
                onClick={onInfo}
                className="h-8 w-8 rounded-full bg-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center"
                aria-label={t('dashboard.moodFocus.helpAria', { label })}
              >
                <Info className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="relative h-2 rounded-full bg-slate-200/60 dark:bg-slate-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400/80 to-violet-500/80 transition-all duration-200"
                style={{ width: `${percentage}%` }}
              />
            </div>

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

            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-150 pointer-events-none z-20"
              style={{ left: `calc(${percentage}% - 10px)` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{t('dashboard.moodFocus.sliderLow')}</span>
            <span>{t('dashboard.moodFocus.sliderHigh')}</span>
          </div>

          {contextualMessage && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{contextualMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}
