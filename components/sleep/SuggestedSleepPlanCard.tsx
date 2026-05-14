'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Heart, Target } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { SleepContextChip } from '@/components/sleep/log-sleep/SleepContextChip'
import type { ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import { inferShiftAwareSleepLog } from '@/lib/sleep/inferShiftAwareSleepLog'
import { resolveLogSleepRecoveryExplainer } from '@/lib/sleep/logSleepRecoveryCopy'
import { resolveLogSleepContextChip } from '@/lib/sleep/logSleepContextChip'
import {
  NAP_END_BEFORE_SHIFT,
  type CaffeineSensitivity,
  type NightShiftSleepPlanResult,
} from '@/lib/sleep/nightShiftSleepPlan'
import { isoDateInTimeZone } from '@/lib/sleep/sleepShiftWallClock'
import type { RotaSleepPlanContext } from '@/lib/sleep/resolveRotaForSleepPlan'
import type { ShiftRelativeSleepAnalysis } from '@/lib/sleep/shiftRelativeSleepClassification'

type Props = {
  timeZone: string
  /** Civil calendar day (YYYY-MM-DD) this plan is scoped to — always "today" from the sleep page. */
  todayYmd: string
  rota: Extract<RotaSleepPlanContext, { state: 'ok' }>
  plan: NightShiftSleepPlanResult
  /** Rota rows for contextual chip (same source as Log Sleep). */
  shiftRows?: ShiftRowInput[]
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

/** Weekday + civil date + clock (local), for unambiguous cross-midnight ranges. */
function formatLocalDateTimeShort(ms: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(ms))
  } catch {
    return formatLocalTime(ms, timeZone)
  }
}

function formatSuggestedSleepWindowRange(
  startMs: number | null,
  endMs: number | null,
  timeZone: string,
  scopeYmd: string,
): string {
  if (startMs == null || endMs == null || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return '— – —'
  }
  const d0 = isoDateInTimeZone(startMs, timeZone)
  const d1 = isoDateInTimeZone(endMs, timeZone)
  if (d0 !== d1) {
    return `${formatLocalDateTimeShort(startMs, timeZone)} – ${formatLocalDateTimeShort(endMs, timeZone)}`
  }
  if (d0 === scopeYmd) {
    return `${formatLocalTime(startMs, timeZone)} – ${formatLocalTime(endMs, timeZone)}`
  }
  return `${formatLocalDateTimeShort(startMs, timeZone)} – ${formatLocalTime(endMs, timeZone)}`
}

function formatLoggedDurationLabel(
  durationMs: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const totalMin = Math.max(0, Math.round(durationMs / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return t('sleepLogs.durationHM', { h: 0, m })
  if (m === 0) return t('sleepLogs.durationH', { h })
  return t('sleepLogs.durationHM', { h, m })
}

function pickShiftRelativeForDisplay(
  plan: NightShiftSleepPlanResult,
  rota: Extract<RotaSleepPlanContext, { state: 'ok' }>,
): Pick<ShiftRelativeSleepAnalysis, 'sleepClass' | 'recoveryState' | 'nextStepMessage' | 'features'> {
  return (
    plan.shiftRelative ?? {
      sleepClass: rota.shiftRelative.sleepClass,
      recoveryState: rota.shiftRelative.recoveryState,
      nextStepMessage: rota.shiftRelative.nextStepMessage,
      features: rota.shiftRelative.features,
    }
  )
}

const detailCardClass =
  'rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)] sm:p-5'

export function SuggestedSleepPlanCard({
  timeZone,
  todayYmd,
  rota,
  plan,
  shiftRows,
  targetSleepMinutes,
  caffeineSensitivity,
  onCaffeineSensitivityChange,
}: Props) {
  const { t } = useTranslation()
  const [howOpen, setHowOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const visibleFeedback = plan.feedback.filter((f) => f.code !== 'none')
  const feedbackHasWarn = visibleFeedback.some((f) => f.severity === 'warn')

  const modelHoursStr = plan.modelSleepMs > 0 ? (plan.modelSleepMs / 3600000).toFixed(1) : '—'

  const hasSleepWindow =
    plan.suggestedSleepStartMs != null &&
    plan.suggestedSleepEndMs != null &&
    Number.isFinite(plan.suggestedSleepStartMs) &&
    Number.isFinite(plan.suggestedSleepEndMs)

  const windowRange = hasSleepWindow
    ? formatSuggestedSleepWindowRange(plan.suggestedSleepStartMs, plan.suggestedSleepEndMs, timeZone, todayYmd)
    : '— – —'

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

  const contextChip = useMemo(() => {
    if (!shiftRows?.length) return null
    const previewEnd = new Date(rota.primarySleep.endMs)
    const rotaSuggestion = inferShiftAwareSleepLog({
      startAt: new Date(rota.primarySleep.startMs),
      endAt: new Date(rota.primarySleep.endMs),
      shifts: shiftRows,
      timeZone,
    })
    return resolveLogSleepContextChip({
      previewEnd,
      rotaSuggestion,
      shiftRows,
      timeZone,
    })
  }, [rota.primarySleep.endMs, rota.primarySleep.startMs, shiftRows, timeZone])

  const recoveryExplainer = useMemo(
    () => resolveLogSleepRecoveryExplainer(rota.shiftRelative, timeZone),
    [rota.shiftRelative, timeZone],
  )

  const loggedSleepRange = formatSuggestedSleepWindowRange(
    rota.primarySleep.startMs,
    rota.primarySleep.endMs,
    timeZone,
    todayYmd,
  )
  const loggedDurationMs = Math.max(0, rota.primarySleep.endMs - rota.primarySleep.startMs)
  const loggedDurationLabel = formatLoggedDurationLabel(loggedDurationMs, t)

  const pageShell = 'space-y-4'

  if (!plan.ok) {
    return (
      <div className={pageShell}>
        <header className="space-y-1 px-0.5">
          <h2 className="text-lg font-bold tracking-tight text-[var(--text-main)] sm:text-xl">
            {t('sleepPlan.recoveryPage.title')}
          </h2>
          <p className="text-sm text-[var(--text-soft)]">{t('sleepPlan.recoveryPage.subtitle')}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {t('sleepPlan.scopeLine', { ymd: todayYmd })}
          </p>
        </header>
        <section
          className={`${detailCardClass} space-y-2`}
          role="status"
        >
          <p className="text-sm leading-relaxed text-[var(--text-soft)]">
            {plan.reason === 'no_main_sleep'
              ? t('sleepPlan.calc.noMainSleep')
              : t('sleepPlan.calc.needShiftBeforeSleep')}
          </p>
        </section>
      </div>
    )
  }

  const shiftRel = pickShiftRelativeForDisplay(plan, rota)
  const recoveryKey =
    plan.latestWakeMs &&
    plan.earliestSleepStartMs &&
    plan.latestWakeMs - plan.earliestSleepStartMs < targetSleepMinutes * 60 * 1000 * 1.15
      ? 'sleepPlan.recovery.tightTurnaround'
      : 'sleepPlan.recovery.body'

  const windowKind = plan.suggestedSleepWindowKind
  const windowIntentKey = `sleepPlan.windowIntent.${windowKind}`
  const windowIntentParams =
    windowKind === 'nap_only' || windowKind === 'none' ? {} : { hours: modelHoursStr }

  return (
    <div className={pageShell}>
      <header className="space-y-1 px-0.5">
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-main)] sm:text-xl">
          {t('sleepPlan.recoveryPage.title')}
        </h2>
        <p className="text-sm text-[var(--text-soft)]">{t('sleepPlan.recoveryPage.subtitle')}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {t('sleepPlan.scopeLine', { ymd: todayYmd })}
        </p>
      </header>

      {/* Hero */}
      <section
        className="rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-b from-[var(--card-subtle)] to-[var(--card)] p-4 shadow-[var(--shadow-soft)] sm:p-5"
        aria-labelledby="sleep-recovery-hero-heading"
      >
        <div className="flex flex-col items-center gap-2">
          <SleepContextChip chip={contextChip} />
        </div>

        <div className="mt-4 flex gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--card)]"
            aria-hidden
          >
            <Heart className="h-6 w-6" strokeWidth={2} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepLog.section.recoveryStatus')}
            </p>
            <h3
              id="sleep-recovery-hero-heading"
              className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--accent-blue)' }}
            >
              {t(`sleepPlan.shiftRelative.recovery.${shiftRel.recoveryState}`)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
              {t(recoveryExplainer.key, recoveryExplainer.params)}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex gap-3">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)]"
              aria-hidden
            >
              <Target className="h-5 w-5" strokeWidth={2} style={{ color: 'var(--accent-indigo)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--accent-indigo)' }}
              >
                {t('sleepPlan.recoveryPage.todayPriority')}
              </p>
              <p className="mt-1 text-base font-semibold leading-snug text-[var(--text-main)] sm:text-lg">
                {t(shiftRel.nextStepMessage.key, shiftRel.nextStepMessage.params)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Logged sleep summary */}
      <section className={detailCardClass} aria-labelledby="sleep-logged-summary-heading">
        <h3
          id="sleep-logged-summary-heading"
          className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]"
        >
          {t('sleepPlan.recoveryPage.basedOnSleep')}
        </h3>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-xs font-medium text-[var(--text-muted)]">{t('sleepPlan.recoveryPage.loggedInterval')}</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums tracking-tight text-[var(--text-main)] sm:text-xl">
              {loggedSleepRange}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-muted)]">{t('sleepPlan.recoveryPage.loggedDuration')}</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-[var(--text-main)]">{loggedDurationLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              {t('sleepPlan.recoveryPage.loggedClassification')}
            </dt>
            <dd className="mt-1 text-sm font-medium leading-relaxed text-[var(--text-main)]">
              {t(`sleepPlan.shiftRelative.class.${shiftRel.sleepClass}`)}
            </dd>
          </div>
        </dl>
      </section>

      <h3 className="px-0.5 text-sm font-bold tracking-tight text-[var(--text-main)]">
        {t('sleepPlan.recoveryPage.planDetails')}
      </h3>

      <div className="space-y-3">
        {/* Suggested sleep window */}
        <section className={detailCardClass}>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('sleepPlan.recoveryPage.suggestedWindowHeading')}
          </h4>
          {hasSleepWindow ? (
            <>
              <p className="mt-3 text-[1.65rem] font-bold leading-none tracking-tight tabular-nums text-[var(--text-main)] sm:text-[1.85rem]">
                {windowRange}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
                {t(windowIntentKey, windowIntentParams)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{t(plan.transitionSummaryKey)}</p>
            </>
          ) : windowKind === 'nap_only' ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">{t(windowIntentKey)}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{t(plan.transitionSummaryKey)}</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-base font-semibold text-[var(--text-main)]">
                {t('sleepPlan.recoveryPage.noWindowTitle')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
                {t('sleepPlan.recoveryPage.noWindowBody')}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">{t(plan.transitionSummaryKey)}</p>
            </>
          )}
        </section>

        {/* Nap */}
        <section className={detailCardClass}>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('sleepPlan.recoveryPage.napHeading')}
          </h4>
          {plan.napSuggested && plan.napWindowStartMs != null && plan.napWindowEndMs != null ? (
            <>
              <p className="mt-3 text-lg font-bold tabular-nums text-[var(--text-main)] sm:text-xl">
                {formatLocalTime(plan.napWindowStartMs, timeZone)} – {formatLocalTime(plan.napWindowEndMs, timeZone)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{napLine}</p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
              {hasSleepWindow ? t('sleepPlan.recoveryPage.napMainSleepFocus') : t('sleepPlan.recoveryPage.napNotNeeded')}
            </p>
          )}
        </section>

        {/* Caffeine + sensitivity */}
        <section className={detailCardClass}>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('sleepPlan.section.latestCaffeine')}
          </h4>
          <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[var(--text-main)] sm:text-3xl">
            {formatLocalTime(plan.caffeineCutoffMs, timeZone)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
            {hasSleepWindow ? t('sleepPlan.recoveryPage.caffeineWhy') : t('sleepPlan.recoveryPage.caffeineWhyNoWindow')}
          </p>

          <div className="mt-5 space-y-2 border-t border-[var(--border-subtle)] pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {t('sleepPlan.caffeineSensitivity.heading')}
            </p>
            <p className="text-xs leading-relaxed text-[var(--text-soft)]">{t('sleepPlan.caffeineSensitivity.help')}</p>
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
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-xs font-medium transition ${
                      selected
                        ? 'border-[var(--accent-blue)] bg-[var(--card-subtle)] text-[var(--text-main)] shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--card)] text-[var(--text-soft)] hover:border-[var(--accent-blue)]/40'
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
                          ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]'
                          : 'border-[var(--text-muted)] bg-transparent'
                      }`}
                      aria-hidden
                    />
                    {t(labelKey)}
                  </label>
                )
              })}
            </div>
          </div>
        </section>

        {/* Light */}
        <section className={detailCardClass}>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('sleepPlan.section.lightExposure')}
          </h4>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">{t('sleepPlan.light.body')}</p>
        </section>

        {/* Recovery focus */}
        <section className={detailCardClass}>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('sleepPlan.recoveryPage.recoveryFocusHeading')}
          </h4>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">{t(recoveryKey)}</p>
        </section>
      </div>

      {visibleFeedback.length > 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
          <button
            type="button"
            id="sleep-plan-feedback-toggle"
            aria-expanded={feedbackOpen}
            aria-controls="sleep-plan-feedback-panel"
            onClick={() => setFeedbackOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs font-semibold text-[var(--text-main)]"
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
              <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
            )}
          </button>
          {feedbackOpen ? (
            <div
              id="sleep-plan-feedback-panel"
              role="region"
              aria-labelledby="sleep-plan-feedback-toggle"
              className="border-t border-[var(--border-subtle)] px-4 pb-4 pt-2"
            >
              <ul className="space-y-1.5">
                {visibleFeedback.map((f, i) => (
                  <li
                    key={`${f.code}-${i}`}
                    className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      f.severity === 'warn'
                        ? 'bg-amber-500/15 text-amber-950 dark:bg-amber-500/20 dark:text-amber-50'
                        : 'bg-[var(--card-subtle)] text-[var(--text-soft)]'
                    }`}
                  >
                    {t(`sleepPlan.feedback.${f.code}`)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-soft)]">
        <button
          type="button"
          onClick={() => setHowOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-[var(--text-main)]"
          aria-expanded={howOpen}
        >
          <span>{t('sleepPlan.howTitle')}</span>
          {howOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
          )}
        </button>

        {howOpen ? (
          <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3">
            <p className="text-xs leading-relaxed text-[var(--text-soft)]">{t('sleepPlan.recoveryPage.howIntro')}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-[11px] leading-relaxed text-[var(--text-muted)]">
              {plan.calculationStepKeys.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <p className="px-0.5 text-[10px] leading-relaxed text-[var(--text-muted)]">{t('sleepPlan.disclaimerShort')}</p>
    </div>
  )
}
