'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, FileText, CheckCircle2 } from 'lucide-react'
import { Event, TYPE_TASK } from '@/lib/models/calendar/Event'
import { format } from 'date-fns'
import { createEvent, updateEvent } from '@/lib/helpers/calendar/EventsHelper'

interface TaskFormModalProps {
  isOpen: boolean
  onClose: () => void
  task?: Event | null
  defaultDate?: Date
  onSave: () => void
}

export function TaskFormModal({ isOpen, onClose, task, defaultDate, onSave }: TaskFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    description: '',
    startTS: defaultDate ? Math.floor(defaultDate.getTime() / 1000) : Math.floor(Date.now() / 1000),
    endTS: defaultDate ? Math.floor(defaultDate.getTime() / 1000) : Math.floor(Date.now() / 1000),
    eventType: 1, // REGULAR_EVENT_TYPE_ID
    color: 0,
    type: TYPE_TASK, // This is a task
    reminder1Minutes: -1,
    reminder2Minutes: -1,
    reminder3Minutes: -1,
    reminder1Type: 0,
    reminder2Type: 0,
    reminder3Type: 0,
    repeatInterval: 0,
    repeatRule: 0,
    repeatLimit: 0,
    repetitionExceptions: [],
    attendees: [],
    flags: 0,
    source: 'simple-calendar',
  })

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          startTS: task.startTS,
          endTS: task.endTS,
          eventType: task.eventType || 1,
          color: task.color || 0,
          type: TYPE_TASK,
          reminder1Minutes: task.reminder1Minutes ?? -1,
          reminder2Minutes: task.reminder2Minutes ?? -1,
          reminder3Minutes: task.reminder3Minutes ?? -1,
          reminder1Type: task.reminder1Type ?? 0,
          reminder2Type: task.reminder2Type ?? 0,
          reminder3Type: task.reminder3Type ?? 0,
          repeatInterval: task.repeatInterval || 0,
          repeatRule: task.repeatRule || 0,
          repeatLimit: task.repeatLimit || 0,
          repetitionExceptions: task.repetitionExceptions || [],
          attendees: task.attendees || [],
          flags: task.flags || 0,
          source: task.source || 'simple-calendar',
        })
      } else if (defaultDate) {
        const startTS = Math.floor(defaultDate.getTime() / 1000)
        setFormData(prev => ({
          ...prev,
          startTS,
          endTS: startTS, // Tasks typically have same start/end
        }))
      }
    }
  }, [isOpen, task, defaultDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title?.trim()) {
      alert('Task title is required')
      return
    }

    setLoading(true)

    try {
      if (task?.id) {
        await updateEvent(task.id, formData)
      } else {
        await createEvent(formData)
      }
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Failed to save task')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const startDate = formData.startTS ? new Date(formData.startTS * 1000) : new Date()
  const startDateStr = format(startDate, 'yyyy-MM-dd')
  const startTimeStr = format(startDate, 'HH:mm')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white/75 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_24px_60px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 dark:from-slate-900/70 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl opacity-0 dark:opacity-100" />
        <div className="pointer-events-none absolute inset-0 ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {task ? 'Edit Task' : 'New Task'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What needs to be done?"
                className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Notes
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition resize-none"
                placeholder="Additional notes..."
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value + 'T' + startTimeStr)
                    setFormData({
                      ...formData,
                      startTS: Math.floor(newDate.getTime() / 1000),
                      endTS: Math.floor(newDate.getTime() / 1000),
                    })
                  }}
                  className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':')
                    const newDate = new Date(startDate)
                    newDate.setHours(parseInt(hours), parseInt(minutes))
                    setFormData({
                      ...formData,
                      startTS: Math.floor(newDate.getTime() / 1000),
                      endTS: Math.floor(newDate.getTime() / 1000),
                    })
                  }}
                  className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/40">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-2xl bg-slate-900 text-slate-50 font-medium
                           shadow-[0_18px_40px_rgba(15,23,42,0.6)]
                           hover:bg-slate-900/95 hover:shadow-[0_20px_50px_rgba(15,23,42,0.75)]
                           active:scale-[0.98]
                           disabled:opacity-60 disabled:shadow-none transition-colors transition-transform"
              >
                {loading ? 'Saving...' : task ? 'Update' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

