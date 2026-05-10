'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { NAP_END_BEFORE_SHIFT, type CaffeineSensitivity, type NightShiftSleepPlanResult } from '@/lib/sleep/nightShiftSleepPlan'
import type { RotaSleepPlanContext } from '@/lib/sleep/resolveRotaForSleepPlan'

type Props = {
  timeZone: string
  /** Civil calendar day (YYYY-MM-DD) this plan is scoped to — always "today" from the sleep page. */
  todayYmd: string
  rota: Extract<RotaSleepPlanContext, { state: 'ok' }>
  plan: NightShiftSleepPlanResult
  targetSleepMinutes: number
  caffeineSensitivity: CaffeineSensitivity
  onCaffeineSensitivityChange: (value: CaffeineSensitivity) => void
}

function formatLocalTime(ms: number | null, timeZone: string): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

export function SuggestedSleepPlanCard({
  timeZone,
  todayYmd,
  rota,
  plan,
  targetSleepMinutes,
  caffeineSensitivity,
  onCaffeineSensitivityChange,
}: Props) {
  const { t } = useTranslation()
  const [howOpen, setHowOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const recoveryKey =
    plan.latestWakeMs &&
    plan.earliestSleepStartMs &&
    plan.latestWakeMs - plan.earliestSleepStartMs < targetSleepMinutes * 60 * 1000 * 1.15
      ? 'sleepPlan.recovery.tightTurnaround'
      : 'sleepPlan.recovery.body'

  const visibleFeedback = plan.feedback.filter((f) => f.code !== 'none')
  const feedbackHasWarn = visibleFeedback.some((f) => f.severity === 'warn')

  const modelHoursStr =
    plan.modelSleepMs > 0 ? (plan.modelSleepMs / 3600000).toFixed(1) : '—'

  const hasSleepWindow =
    plan.suggestedSleepStartMs != null &&
    plan.suggestedSleepEndMs != null &&
    Number.isFinite(plan.suggestedSleepStartMs) &&
    Number.isFinite(plan.suggestedSleepEndMs)

  const windowStart = formatLocalTime(plan.suggestedSleepStartMs, timeZone)
  const windowEnd = formatLocalTime(plan.suggestedSleepEndMs, timeZone)
  const windowRange = hasSleepWindow ? `${windowStart} – ${windowEnd}` : '— – —'

  const napDurationMin =
    plan.napSuggested && plan.napWindowStartMs != null && plan.napWindowEndMs != null
      ? Math.max(1, Math.round((plan.napWindowEndMs - plan.napWindowStartMs) / 60000))
      : 0
  const napEndsMinutesBeforeShift =
    plan.napSuggested && plan.napWindowEndMs != null && rota.nextShift
      ? Math.max(0, Math.round((rota.nextShift.startMs - plan.napWindowEndMs) / 60000))
      : NAP_END_BEFORE_SHIFT

  const napLine =
    plan.napSuggested && plan.napWindowStartMs != null && plan.napWindowEndMs != null
      ? t('sleepPlan.nap.whenApprox', {
          start: formatLocalTime(plan.napWindowStartMs, timeZone),
          end: formatLocalTime(plan.napWindowEndMs, timeZone),
          napMin: napDurationMin,
          beforeShift: napEndsMinutesBeforeShift,
        })
      : t('sleepPlan.nap.none')

  const cardShell =
    'rounded-xl border border-sky-200/60 bg-gradient-to-b from-sky-50 via-white to-slate-50/90 px-5 py-5 shadow-sm dark:border-slate-700/80 dark:from-slate-900/70 dark:via-[var(--card)] dark:to-slate-950/60'

  if (!plan.ok) {
    return (
      <section className={`${cardShell} space-y-2`}>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-main)]">{t('sleepPlan.title')}</h2>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {t('sleepPlan.scopeLine', { ymd: todayYmd })}
        </p>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {plan.reason === 'no_main_sleep'
            ? t('sleepPlan.calc.noMainSleep')
            : t('sleepPlan.calc.needShiftBeforeSleep')}
        </p>
      </section>
    )
  }

  return (
    <section className={`${cardShell} space-y-6`}>
      <header className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)]">{t('sleepPlan.title')}</h2>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {t('sleepPlan.scopeLine', { ymd: todayYmd })}
        </p>
      </header>

      {/* Sleep window — directly below suggested plan title */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-main)]">{t('sleepPlan.section.sleepWindow')}</h3>
        <p className="mt-2 text-[1.65rem] font-bold leading-none tracking-tight text-teal-600 tabular-nums dark:text-teal-400">
          {windowRange}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {hasSleepWindow
            ? t('sleepPlan.windowExplainer', { hours: modelHoursStr })
            : t('sleepPlan.windowExplainerNoWindow')}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {t(plan.transitionSummaryKey)}
        </p>
      </div>

      {visibleFeedback.length > 0 && (
        <div className="rounded-lg border border-slate-200/90 bg-white/60 dark:border-slate-600/80 dark:bg-slate-900/40">
          <button
            type="button"
            id="sleep-plan-feedback-toggle"
            aria-expanded={feedbackOpen}
            aria-controls="sleep-plan-feedback-panel"
            onClick={() => setFeedbackOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-100"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {feedbackHasWarn ? (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400"
                  aria-hidden
                />
              ) : null}
              <span className="truncate">{t('sleepPlan.feedbackDropdown.summary', { count: visibleFeedback.length })}</span>
            </span>
            {feedbackOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            )}
          </button>
          {feedbackOpen ? (
            <div
              id="sleep-plan-feedback-panel"
              role="region"
              aria-labelledby="sleep-plan-feedback-toggle"
              className="border-t border-slate-200/80 px-3 py-2 dark:border-slate-600/80"
            >
              <ul className="space-y-1.5">
                {visibleFeedback.map((f, i) => (
                  <li
                    key={`${f.code}-${i}`}
                    className={`rounded-md px-3 py-2 text-xs leading-relaxed ${
                      f.severity === 'warn'
                        ? 'bg-amber-500/15 text-amber-950 dark:bg-amber-500/20 dark:text-amber-50'
                        : 'bg-slate-200/60 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300'
                    }`}
                  >
                    {t(`sleepPlan.feedback.${f.code}`)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {/* Caffeine sensitivity — drives cutoff below */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-800/90 dark:text-sky-300/90">
          {t('sleepPlan.caffeineSensitivity.heading')}
        </p>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {t('sleepPlan.caffeineSensitivity.help')}
        </p>
        <div
          className="flex gap-2"
          role="radiogroup"
          aria-label={t('sleepPlan.caffeineSensitivity.heading')}
        >
          {(
            [
              { value: 'low' as const, labelKey: 'sleepPlan.caffeineOption.low' },
              { value: 'medium' as const, labelKey: 'sleepPlan.caffeineOption.medium' },
              { value: 'high' as const, labelKey: 'sleepPlan.caffeineOption.high' },
            ] as const
          ).map(({ value, labelKey }) => {
            const selected = caffeineSensitivity === value
            return (
              <label
                key={value}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
                  selected
                    ? 'border-sky-400 bg-sky-100 text-slate-900 shadow-sm dark:border-sky-500/60 dark:bg-sky-950/50 dark:text-sky-50'
                    : 'border-slate-200/80 bg-white/80 text-slate-700 hover:border-sky-300/60 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="sleep-plan-caffeine-sensitivity"
                  value={value}
                  checked={selected}
                  onChange={() => onCaffeineSensitivityChange(value)}
                  className="sr-only"
                />
                <span
                  className={`flex h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
                    selected
                      ? 'border-red-500 bg-red-500 dark:border-red-400 dark:bg-red-400'
                      : 'border-slate-400 bg-transparent dark:border-slate-500'
                  }`}
                  aria-hidden
                />
                {t(labelKey)}
              </label>
            )
          })}
        </div>
      </div>

      {/* Latest caffeine cutoff */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-main)]">{t('sleepPlan.section.latestCaffeine')}</h3>
        <p className="mt-2 text-lg font-bold tabular-nums text-[var(--text-main)]">
          {formatLocalTime(plan.caffeineCutoffMs, timeZone)}
        </p>
      </div>

      {/* Nap window */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-main)]">{t('sleepPlan.section.napWindow')}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{napLine}</p>
      </div>

      {/* Light exposure — italic body */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-main)]">{t('sleepPlan.section.lightExposure')}</h3>
        <p className="mt-2 text-sm italic leading-relaxed text-slate-600 dark:text-slate-400">
          {t('sleepPlan.light.body')}
        </p>
      </div>

      {/* Recovery */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-main)]">{t('sleepPlan.section.recovery')}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t(recoveryKey)}</p>
      </div>

      <div className="border-t border-sky-200/50 pt-4 dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => setHowOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-teal-700 dark:text-teal-400/90"
        >
          <span>{t('sleepPlan.howTitle')}</span>
          {howOpen ? <ChevronUp className="h-4 w-4 shrink-0 opacity-80" /> : <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />}
        </button>

        {howOpen && (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            {plan.calculationStepKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-500">{t('sleepPlan.disclaimerShort')}</p>
    </section>
  )
}
