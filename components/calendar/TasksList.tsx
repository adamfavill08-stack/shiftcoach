'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckCircle2, Circle, Trash2, Loader2 } from 'lucide-react'
import { Event, FLAG_TASK_COMPLETED, isTask, isTaskCompleted } from '@/lib/models/calendar/Event'
import { format } from 'date-fns'
import { de, enUS, es, fr, pl, ptBR } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { normalizeCalendarEvent } from '@/lib/helpers/calendar/normalizeCalendarEvent'
import { cancelTaskReminders } from '@/lib/notifications/taskLocalNotifications'
import { explainCalendarApiError } from '@/lib/helpers/calendar/calendarApiErrorCopy'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import type { AppLocaleCode } from '@/lib/i18n/supportedLocales'

function dateFnsLocaleFor(code: AppLocaleCode): Locale {
  switch (code) {
    case 'es':
      return es
    case 'de':
      return de
    case 'fr':
      return fr
    case 'pl':
      return pl
    case 'pt-BR':
      return ptBR
    case 'pt':
      return ptBR
    default:
      return enUS
  }
}

interface TasksListProps {
  date?: Date // Filter tasks for a specific date
  /** Increment to refetch after creating/updating a task elsewhere */
  reloadToken?: number
  onTaskClick?: (task: Event) => void
  onTaskComplete?: (task: Event) => void
  onTaskDelete?: (task: Event) => void
}

export function TasksList({
  date,
  reloadToken = 0,
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
}: TasksListProps) {
  const { language } = useLanguage()
  const { t } = useTranslation()
  const dfLocale = useMemo(() => dateFnsLocaleFor(language), [language])
  const [tasks, setTasks] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const now = Math.floor(Date.now() / 1000)
      const fromTS = date
        ? Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000)
        : now
      const toTS = date
        ? Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime() / 1000)
        : now + 86400 * 7 // Next 7 days

      const params = new URLSearchParams({
        fromTS: String(fromTS),
        toTS: String(toTS),
        type: 'task',
      })
      const response = await authedFetch(`/api/calendar/events?${params}`)
      if (!response.ok) {
        let message = t('calendar.tasksList.unavailable')
        try {
          const details = await response.json()
          if (details?.error) {
            message = details.error
          } else if (response.status === 401) {
            message = t('calendar.tasksList.signInRequired')
          }
        } catch {
          // ignore JSON parse errors
        }
        setError(message)
        setTasks([])
        return
      }

      const data = await response.json()
      const taskEvents = (data.events as Record<string, unknown>[] | undefined)
        ?.map((e) => normalizeCalendarEvent(e))
        .filter((e): e is Event => e != null && isTask(e)) ?? []
      
      // Sort by start time, incomplete tasks first
      taskEvents.sort((a: Event, b: Event) => {
        const aCompleted = isTaskCompleted(a)
        const bCompleted = isTaskCompleted(b)
        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1
        }
        return a.startTS - b.startTS
      })

      setTasks(taskEvents)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('calendar.tasksList.somethingWrong')
      setError(msg)
      console.error('Error loading tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [date, t])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks, reloadToken])

  async function handleToggleComplete(task: Event) {
    try {
      const newFlags = isTaskCompleted(task)
        ? task.flags & ~FLAG_TASK_COMPLETED
        : task.flags | FLAG_TASK_COMPLETED

      const response = await authedFetch(`/api/calendar/events/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...task,
          flags: newFlags,
        }),
      })

      if (!response.ok) {
        throw new Error(t('calendar.tasksList.updateFailed'))
      }

      await loadTasks()
      onTaskComplete?.(task)
    } catch (err: any) {
      console.error('Error updating task:', err)
      alert(t('calendar.tasksList.updateFailed'))
    }
  }

  async function handleDelete(task: Event) {
    if (!confirm(t('calendar.tasksList.deleteConfirm'))) {
      return
    }

    try {
      if (task.id != null) {
        await cancelTaskReminders(task.id)
      }
      const response = await authedFetch(`/api/calendar/events/${task.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(t('calendar.tasksList.deleteFailed'))
      }

      await loadTasks()
      onTaskDelete?.(task)
    } catch (err: any) {
      console.error('Error deleting task:', err)
      alert(t('calendar.tasksList.deleteFailed'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    const { summary, steps } = explainCalendarApiError(error, t)
    return (
      <div className="rounded-2xl bg-gradient-to-r from-red-50/80 via-rose-50/80 to-red-50/80 dark:from-red-950/30 dark:via-rose-950/25 dark:to-red-950/30 border border-red-200/80 dark:border-red-800/60 px-4 py-3 shadow-sm">
        <p className="text-xs font-medium text-red-600 dark:text-red-300">{summary}</p>
        <p className="mt-2 text-[11px] leading-relaxed whitespace-pre-line text-red-600/90 dark:text-red-300/85">
          {steps}
        </p>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {date
            ? t('calendar.tasksList.emptyForDate', {
                date: format(date, 'PPP', { locale: dfLocale }),
              })
            : t('calendar.tasksList.emptyYet')}
        </p>
      </div>
    )
  }

  const incompleteTasks = tasks.filter((task) => !isTaskCompleted(task))
  const completedTasks = tasks.filter((task) => isTaskCompleted(task))

  return (
    <div className="space-y-3">
      {/* Incomplete Tasks */}
      {incompleteTasks.length > 0 && (
        <div className="space-y-2">
          {incompleteTasks.map((task) => {
            const taskDate = new Date(task.startTS * 1000)
            const isOverdue = taskDate < new Date() && !isTaskCompleted(task)

            return (
              <div
                key={task.id}
                className={`rounded-xl border transition ${
                  isOverdue
                    ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30'
                    : 'bg-white/70 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/40'
                } hover:bg-white/90 dark:hover:bg-slate-800/70`}
              >
                <div className="p-3 flex items-start gap-3">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-sky-500 dark:hover:border-sky-400 transition flex items-center justify-center"
                  >
                    <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </button>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <p className={`text-sm font-medium ${
                      isOverdue
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      {format(taskDate, 'PPp', { locale: dfLocale })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(task)}
                    className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 transition"
                    aria-label={t('calendar.tasksList.deleteAria')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/40">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-1">
            {t('calendar.tasksList.completed', { count: completedTasks.length })}
          </p>
          {completedTasks.map((task) => {
            const taskDate = new Date(task.startTS * 1000)
            return (
              <div
                key={task.id}
                className="rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 opacity-60"
              >
                <div className="p-3 flex items-start gap-3">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500 dark:bg-emerald-600 border-2 border-emerald-500 dark:border-emerald-600 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </button>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 line-through">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      {format(taskDate, 'PPp', { locale: dfLocale })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(task)}
                    className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 transition"
                    aria-label={t('calendar.tasksList.deleteAria')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

