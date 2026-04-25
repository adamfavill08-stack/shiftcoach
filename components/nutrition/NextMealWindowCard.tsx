'use client'

import { useEffect, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { Inter } from 'next/font/google'
import { useTranslation } from '@/components/providers/language-provider'
import type { MealTimingTodayCardData } from '@/lib/hooks/useMealTimingTodayCard'

const inter = Inter({ subsets: ['latin'] })

export type NextMealWindowCardProps = {
  data: MealTimingTodayCardData | null
  loading: boolean
  /** `elevated` matches glass cards on the full Adjusted Calories dashboard view. */
  variant?: 'compact' | 'elevated'
}

export function NextMealWindowCard({
  data,
  loading,
  variant = 'compact',
}: NextMealWindowCardProps) {
  const { t } = useTranslation()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('mealNotificationsEnabled')
    if (stored === 'off') {
      setNotificationsEnabled(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return
    if (!notificationsEnabled) return
    if (!data?.nextMealAt || !data.nextMealLabel) return

    const msUntil = new Date(data.nextMealAt).getTime() - Date.now()
    if (msUntil <= 0 || msUntil > 6 * 60 * 60 * 1000) {
      return
    }

    const storageKey = 'nextMealNotification'
    const signature = `${data.nextMealAt}|${data.nextMealLabel}`
    const lastSignature = window.localStorage.getItem(storageKey)
    if (lastSignature === signature) return

    let timeoutId: number | undefined

    const schedule = async () => {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission()
        }
      } catch {
        // ignore permission errors
      }
      if (Notification.permission !== 'granted') return

      timeoutId = window.setTimeout(() => {
        try {
          new Notification(t('dashboard.nextMealWindow.title'), {
            body: `${t('dashboard.nextMealWindow.nextPrefix')} ${data.nextMealLabel} ${t('dashboard.nextMealWindow.at')} ${data.nextMealTime}`,
          })
          window.localStorage.setItem(storageKey, signature)
        } catch {
          // If notifications fail, just skip
        }
      }, msUntil)
    }

    schedule()

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [data?.nextMealAt, data?.nextMealLabel, data?.nextMealTime, notificationsEnabled, t])

  const handleToggleNotifications = () => {
    const next = !notificationsEnabled
    setNotificationsEnabled(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('mealNotificationsEnabled', next ? 'on' : 'off')
    }
  }

  const shell =
    variant === 'elevated'
      ? [
          'relative overflow-hidden rounded-3xl',
          'bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl',
          'border border-slate-200/50 dark:border-slate-700/40',
          'text-slate-900 dark:text-slate-100',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]',
          'dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]',
          'p-6',
        ].join(' ')
      : 'block rounded-xl bg-white border border-blue-300 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'

  if (loading) {
    return (
      <div className={`${shell} animate-pulse`}>
        <div
          className={`h-3 w-40 rounded mb-3 ${
            variant === 'elevated' ? 'bg-slate-200/80 dark:bg-slate-700/60' : 'bg-slate-200'
          }`}
        />
        <div
          className={`h-3 w-full max-w-[280px] rounded ${
            variant === 'elevated' ? 'bg-slate-100/90 dark:bg-slate-800/50' : 'bg-slate-100'
          }`}
        />
        <div
          className={`mt-4 h-4 w-full rounded ${
            variant === 'elevated' ? 'bg-slate-100/90 dark:bg-slate-800/50' : 'bg-slate-100'
          }`}
        />
      </div>
    )
  }

  if (!data || !data.meals || data.meals.length === 0) {
    return null
  }

  const shiftBadgeLabel = data.shiftLabel?.trim() || t('dashboard.nextMealWindow.scheduleFallback')
  const heroTime = data.nextMealTime || '—'
  const heroLabel = data.nextMealLabel || t('dashboard.nextMealWindow.nextPrefix')
  const supportLine = data.cardSubtitle?.trim() || t('dashboard.nextMealWindow.subtitleFallback')

  if (variant === 'compact') {
    return (
      <div className={shell}>
        <span className={`block text-sm font-semibold tracking-[0.08em] text-black ${inter.className}`}>
          {t('dashboard.nextMealWindow.title')}
        </span>

        <div className="mt-2.5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[34px] font-semibold leading-none text-slate-900 tabular-nums">{heroTime}</p>
            <p className="mt-1 text-[15px] font-medium leading-tight text-slate-800">{heroLabel}</p>
            {data.nextMealSubtitle?.trim() ? (
              <p className="mt-0.5 text-[12px] leading-snug text-slate-600">{data.nextMealSubtitle.trim()}</p>
            ) : null}
            <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{supportLine}</p>
          </div>
          <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-slate-300/90 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-800">
            {shiftBadgeLabel}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={shell}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700 dark:text-slate-200">
                  {t('dashboard.nextMealWindow.title')}
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  {data.cardSubtitle?.trim() || t('dashboard.nextMealWindow.subtitleFallback')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifications}
              className="inline-flex items-center gap-2 text-[10px] font-medium text-slate-600 dark:text-slate-300"
            >
              <span className="mr-1">{t('dashboard.nextMealWindow.alerts')}</span>
              <span
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full bg-white shadow transition-transform ${
                    notificationsEnabled ? 'translate-x-3' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="mt-2">
            <div
              className={`flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-200 pt-1 border-t ${
                variant === 'elevated'
                  ? 'border-slate-200/50 dark:border-slate-700/50'
                  : 'border-slate-200/60'
              }`}
            >
              <span className="flex flex-col gap-0.5">
                <span>
                  {t('dashboard.nextMealWindow.nextPrefix')}{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{data.nextMealLabel}</span>{' '}
                  {t('dashboard.nextMealWindow.at')} {data.nextMealTime}
                </span>
                {data.nextMealSubtitle?.trim() ? (
                  <span className="font-normal text-slate-600 dark:text-slate-400">{data.nextMealSubtitle.trim()}</span>
                ) : null}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-slate-100 dark:bg-slate-800/60 text-[10px] text-slate-700 dark:text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {shiftBadgeLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
