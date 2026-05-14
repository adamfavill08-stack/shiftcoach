'use client'

import { useTranslation } from '@/components/providers/language-provider'

export type SleepFeelingId = 'exhausted' | 'tired' | 'okay' | 'refreshed'

const ORDER: SleepFeelingId[] = ['exhausted', 'tired', 'okay', 'refreshed']

/** Simple emoji faces — decorative; labels are translated for accessibility. */
const FACE: Record<SleepFeelingId, string> = {
  exhausted: '😩',
  tired: '😐',
  okay: '🙂',
  refreshed: '😄',
}

type Props = {
  value: SleepFeelingId
  onChange: (v: SleepFeelingId) => void
}

export function feelingToQualityNumber(f: SleepFeelingId): 2 | 3 | 4 | 5 {
  switch (f) {
    case 'exhausted':
      return 2
    case 'tired':
      return 3
    case 'okay':
      return 4
    case 'refreshed':
      return 5
  }
}

export function FeelingSelector({ value, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <h3 className="text-base font-bold tracking-tight text-[var(--text-main)]">
        {t('sleepLog.section.howFeel')}
      </h3>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {ORDER.map((id) => {
          const selected = value === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={selected}
              className={`flex min-h-[5.25rem] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2.5 text-center transition-all active:scale-[0.98] ${
                selected
                  ? 'border-[color-mix(in_srgb,var(--accent-blue)_50%,var(--border-subtle))] bg-[var(--card-subtle)] shadow-md ring-2 ring-[color-mix(in_srgb,var(--accent-blue)_38%,transparent)]'
                  : 'border-[var(--border-subtle)] bg-[var(--card-subtle)]/50 text-[var(--text-soft)] hover:bg-[var(--card-subtle)]'
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {FACE[id]}
              </span>
              <span className="text-[10px] font-semibold leading-tight text-[var(--text-main)]">
                {t(`sleepLog.feeling.${id}`)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
