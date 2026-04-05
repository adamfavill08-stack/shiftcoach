'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, ChevronLeft, Plus, X } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { TasksList } from './TasksList'
import { TaskFormModal } from './TaskFormModal'
import { Event } from '@/lib/models/calendar/Event'

interface FilterMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function FilterMenu({ isOpen, onClose }: FilterMenuProps) {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Event | null>(null)
  const [tasksReloadToken, setTasksReloadToken] = useState(0)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // TaskFormModal is a sibling of menuRef (not inside it). Clicks on the form would
      // otherwise count as "outside" and close the whole tasks sheet.
      if (showTaskForm) return
      const el = event.target as Node | null
      if (el instanceof Element && el.closest('[data-shiftcoach-task-form-root]')) return

      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, showTaskForm])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Filter/Tasks Panel – centered sheet so it appears over the current calendar */}
      <div
        ref={menuRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(24rem,calc(100%-2.5rem))] max-h-[min(34rem,calc(100%-3rem))] rounded-3xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-[0_24px_70px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
      >
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 dark:from-slate-900/70 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl opacity-0 dark:opacity-100" />
        <div className="pointer-events-none absolute inset-0 ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between gap-2 px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/90">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="mr-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
              aria-label={t('calendar.filter.backAria')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {t('calendar.filter.title')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('calendar.filter.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content — Back link here so it stays visible with the task list / errors (not only in the title bar) */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          <button
            type="button"
            onClick={onClose}
            className="mb-3 flex w-fit items-center gap-0.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t('calendar.filter.backToCalendar')}
          </button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('calendar.filter.yourTasks')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('calendar.filter.manageTodos')}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTask(null)
                setShowTaskForm(true)
              }}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-700 text-white text-sm font-medium hover:from-sky-700 hover:to-indigo-800 active:scale-95 transition shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('calendar.filter.addTask')}
            </button>
          </div>
          <TasksList
            reloadToken={tasksReloadToken}
            onTaskClick={(task) => {
              setSelectedTask(task)
              setShowTaskForm(true)
            }}
          />
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskFormModal
          isOpen={showTaskForm}
          onClose={() => {
            setShowTaskForm(false)
            setSelectedTask(null)
          }}
          task={selectedTask}
          onSave={() => {
            setTasksReloadToken((n) => n + 1)
          }}
        />
      )}
    </>
  )
}

