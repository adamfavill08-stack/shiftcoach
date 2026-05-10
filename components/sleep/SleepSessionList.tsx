'use client'

import { useCallback, useMemo } from 'react'
import { Pencil, Trash2, Clock } from 'lucide-react'
import { classifySleep, getClassificationColor } from '@/lib/sleep/classifySleep'
import type { SleepType } from '@/lib/sleep/types'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import { intlLocaleForApp } from '@/lib/i18n/supportedLocales'
import { sleepTypeToUiKey } from '@/lib/i18n/sleepTypeTranslationKey'

interface SleepSession {
  id: string
  start_at: string
  end_at: string
  type: SleepType
  durationHours: number
  quality?: string | number | null
}

type SleepSessionListProps = {
  sessions: SleepSession[]
  onEdit?: (session: SleepSession) => void
  onDelete?: (sessionId: string) => void
  loading?: boolean
}

export function SleepSessionList({
  sessions,
  onEdit,
  onDelete,
  loading = false,
}: SleepSessionListProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const intlLocale = useMemo(() => intlLocaleForApp(language), [language])

  const translateQuality = useCallback(
    (raw: string | number | null | undefined) => {
      if (raw == null || raw === '') return ''
      if (typeof raw === 'number') return String(raw)
      const q = raw.trim().toLowerCase()
      if (q === 'excellent') return t('sleepQuality.excellent')
      if (q === 'good') return t('sleepQuality.good')
      if (q === 'fair') return t('sleepQuality.fair')
      if (q === 'poor') return t('sleepQuality.poor')
      if (q === 'very poor' || q === 'very_poor') return t('sleepQuality.veryPoor')
      return raw
    },
    [t],
  )

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0 && m === 0) return t('sleepLogs.duration0')
    if (m === 0) return t('sleepLogs.durationH', { h })
    return t('sleepLogs.durationHM', { h, m })
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('sleepSessionList.loading')}</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('sleepSessionList.empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const classification = classifySleep({
          start_at: session.start_at,
          end_at: session.end_at,
          durationHours: session.durationHours,
        })

        const colorClass = getClassificationColor(classification.classification)

        return (
          <div
            key={session.id}
            className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-sm dark:border-slate-600/70 dark:bg-slate-800/95 dark:shadow-inner"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 to-white/85 dark:from-slate-800/90 dark:to-slate-900/90" />
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/60 dark:ring-slate-500/25" />

            <div className="relative z-10">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
                  <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {t(sleepTypeToUiKey(session.type))}
                  </span>
                </div>

                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(session)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200/60 bg-blue-50/80 text-blue-600 transition-all hover:scale-105 hover:bg-blue-100/80 active:scale-95 dark:border-blue-500/40 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/70"
                        aria-label={t('sleep7.editAria')}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(session.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200/60 bg-rose-50/80 text-rose-600 transition-all hover:scale-105 hover:bg-rose-100/80 active:scale-95 dark:border-rose-500/35 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60"
                        aria-label={t('sleep7.deleteAria')}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 opacity-80 dark:text-slate-400" aria-hidden />
                  <span>
                    {formatTime(session.start_at)} – {formatTime(session.end_at)}
                  </span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDuration(session.durationHours)}
                </span>
                {session.quality != null && session.quality !== '' && (
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('sleepSessionList.quality', {
                      q: translateQuality(session.quality),
                    })}
                  </span>
                )}
              </div>

              {classification.reasoningKey && (
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {t(classification.reasoningKey)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
