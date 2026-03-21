'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Plus, Trash2, Loader2 } from 'lucide-react'
import { Event, TYPE_TASK, FLAG_TASK_COMPLETED, isTask, isTaskCompleted } from '@/lib/models/calendar/Event'
import { format } from 'date-fns'

interface TasksListProps {
  date?: Date // Filter tasks for a specific date
  onTaskClick?: (task: Event) => void
  onTaskComplete?: (task: Event) => void
  onTaskDelete?: (task: Event) => void
}

export function TasksList({ date, onTaskClick, onTaskComplete, onTaskDelete }: TasksListProps) {
  const [tasks, setTasks] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
  }, [date])

  async function loadTasks() {
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

      const response = await fetch(`/api/calendar/events?fromTS=${fromTS}&toTS=${toTS}&type=task`)
      if (!response.ok) {
        // Try to surface a more helpful message, but don't break the UI
        let message = 'Tasks are temporarily unavailable.'
        try {
          const details = await response.json()
          if (details?.error) {
            message = details.error
          } else if (response.status === 401) {
            message = 'Sign in to see your tasks.'
          }
        } catch {
          // ignore JSON parse errors
        }
        setError(message)
        setTasks([])
        return
      }

      const data = await response.json()
      const taskEvents = (data.events || []).filter((e: Event) => isTask(e))
      
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
    } catch (err: any) {
      setError(err.message)
      console.error('Error loading tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleComplete(task: Event) {
    try {
      const newFlags = isTaskCompleted(task)
        ? task.flags & ~FLAG_TASK_COMPLETED
        : task.flags | FLAG_TASK_COMPLETED

      const response = await fetch(`/api/calendar/events/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...task,
          flags: newFlags,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      await loadTasks()
      onTaskComplete?.(task)
    } catch (err: any) {
      console.error('Error updating task:', err)
      alert('Failed to update task')
    }
  }

  async function handleDelete(task: Event) {
    if (!confirm('Delete this task?')) {
      return
    }

    try {
      const response = await fetch(`/api/calendar/events/${task.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      await loadTasks()
      onTaskDelete?.(task)
    } catch (err: any) {
      console.error('Error deleting task:', err)
      alert('Failed to delete task')
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
    return (
      <div className="rounded-2xl bg-gradient-to-r from-red-50/80 via-rose-50/80 to-red-50/80 dark:from-red-950/30 dark:via-rose-950/25 dark:to-red-950/30 border border-red-200/80 dark:border-red-800/60 px-4 py-3 shadow-sm">
        <p className="text-xs font-medium text-red-600 dark:text-red-300">
          {error}
        </p>
        <p className="mt-1 text-[11px] text-red-500/80 dark:text-red-400/80">
          Check your connection and try again in a moment.
        </p>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No tasks {date ? `for ${format(date, 'MMMM d, yyyy')}` : 'yet'}
        </p>
      </div>
    )
  }

  const incompleteTasks = tasks.filter(t => !isTaskCompleted(t))
  const completedTasks = tasks.filter(t => isTaskCompleted(t))

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
                      {format(taskDate, 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(task)}
                    className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 transition"
                    aria-label="Delete task"
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
            Completed ({completedTasks.length})
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
                      {format(taskDate, 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(task)}
                    className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 transition"
                    aria-label="Delete task"
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

