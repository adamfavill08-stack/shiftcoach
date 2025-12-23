'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, FileText, Repeat, Bell, Users, Palette } from 'lucide-react'
import { Event, REMINDER_OFF } from '@/lib/models/calendar/Event'
import { EventType } from '@/lib/models/calendar/EventType'
import { format } from 'date-fns'
import { getEventTypes } from '@/lib/helpers/calendar/EventsHelper'
import { createEvent, updateEvent } from '@/lib/helpers/calendar/EventsHelper'
import { RemindersPicker, ReminderConfig } from './RemindersPicker'
import { RecurrencePicker, RecurrenceConfig } from './RecurrencePicker'
import { AttendeesPicker } from './AttendeesPicker'

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  event?: Event | null
  defaultDate?: Date
  onSave: () => void
}

export function EventFormModal({ isOpen, onClose, event, defaultDate, onSave }: EventFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    description: '',
    location: '',
    startTS: defaultDate ? Math.floor(defaultDate.getTime() / 1000) : Math.floor(Date.now() / 1000),
    endTS: defaultDate ? Math.floor(defaultDate.getTime() / 1000) + 3600 : Math.floor(Date.now() / 1000) + 3600,
    eventType: 1, // REGULAR_EVENT_TYPE_ID
    color: 0,
    type: 0, // TYPE_EVENT
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
      loadEventTypes()
      if (event) {
        setFormData({
          title: event.title || '',
          description: event.description || '',
          location: event.location || '',
          startTS: event.startTS,
          endTS: event.endTS,
          eventType: event.eventType || 1,
          color: event.color || 0,
          type: event.type || 0,
          reminder1Minutes: event.reminder1Minutes ?? -1,
          reminder2Minutes: event.reminder2Minutes ?? -1,
          reminder3Minutes: event.reminder3Minutes ?? -1,
          reminder1Type: event.reminder1Type ?? 0,
          reminder2Type: event.reminder2Type ?? 0,
          reminder3Type: event.reminder3Type ?? 0,
          repeatInterval: event.repeatInterval || 0,
          repeatRule: event.repeatRule || 0,
          repeatLimit: event.repeatLimit || 0,
          repetitionExceptions: event.repetitionExceptions || [],
          attendees: event.attendees || [],
          flags: event.flags || 0,
          source: event.source || 'simple-calendar',
        })
      } else if (defaultDate) {
        const startTS = Math.floor(defaultDate.getTime() / 1000)
        setFormData(prev => ({
          ...prev,
          startTS,
          endTS: startTS + 3600, // 1 hour default
        }))
      }
    }
  }, [isOpen, event, defaultDate])

  async function loadEventTypes() {
    const types = await getEventTypes()
    setEventTypes(types)
  }

  function handleRemindersChange(reminders: ReminderConfig[]) {
    // Update formData with reminders
    const reminder1 = reminders[0] || { minutes: -1, type: 0 }
    const reminder2 = reminders[1] || { minutes: -1, type: 0 }
    const reminder3 = reminders[2] || { minutes: -1, type: 0 }
    
    setFormData({
      ...formData,
      reminder1Minutes: reminder1.minutes,
      reminder1Type: reminder1.type,
      reminder2Minutes: reminder2.minutes,
      reminder2Type: reminder2.type,
      reminder3Minutes: reminder3.minutes,
      reminder3Type: reminder3.type,
    })
  }

  function getCurrentReminders(): ReminderConfig[] {
    const reminders: ReminderConfig[] = []
    if (formData.reminder1Minutes !== undefined && formData.reminder1Minutes !== REMINDER_OFF) {
      reminders.push({ minutes: formData.reminder1Minutes, type: formData.reminder1Type || 0 })
    }
    if (formData.reminder2Minutes !== undefined && formData.reminder2Minutes !== REMINDER_OFF) {
      reminders.push({ minutes: formData.reminder2Minutes, type: formData.reminder2Type || 0 })
    }
    if (formData.reminder3Minutes !== undefined && formData.reminder3Minutes !== REMINDER_OFF) {
      reminders.push({ minutes: formData.reminder3Minutes, type: formData.reminder3Type || 0 })
    }
    return reminders
  }

  function getCurrentRecurrence(): RecurrenceConfig {
    return {
      interval: formData.repeatInterval || 0,
      rule: formData.repeatRule || 0,
      limit: formData.repeatLimit || 0,
    }
  }

  function handleRecurrenceChange(recurrence: RecurrenceConfig) {
    setFormData({
      ...formData,
      repeatInterval: recurrence.interval,
      repeatRule: recurrence.rule,
      repeatLimit: recurrence.limit,
    })
  }

  function getEventStartDate(): Date {
    if (formData.startTS) {
      return new Date(formData.startTS * 1000)
    }
    return defaultDate || new Date()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (event?.id) {
        await updateEvent(event.id, formData)
      } else {
        await createEvent(formData)
      }
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving event:', error)
      alert('Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const startDate = new Date(formData.startTS! * 1000)
  const endDate = new Date(formData.endTS! * 1000)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {event ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
              placeholder="Event title"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Start
              </label>
              <input
                type="datetime-local"
                required
                value={format(startDate, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => {
                  const newStart = new Date(e.target.value)
                  setFormData({
                    ...formData,
                    startTS: Math.floor(newStart.getTime() / 1000),
                    endTS: formData.endTS! < formData.startTS! 
                      ? Math.floor(newStart.getTime() / 1000) + 3600
                      : formData.endTS,
                  })
                }}
                className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                End
              </label>
              <input
                type="datetime-local"
                required
                value={format(endDate, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => {
                  const newEnd = new Date(e.target.value)
                  setFormData({
                    ...formData,
                    endTS: Math.floor(newEnd.getTime() / 1000),
                  })
                }}
                className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
              />
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allDay"
              checked={(formData.flags! & 1) !== 0} // FLAG_ALL_DAY
              onChange={(e) => {
                setFormData({
                  ...formData,
                  flags: e.target.checked 
                    ? (formData.flags! | 1) 
                    : (formData.flags! & ~1),
                })
              }}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="allDay" className="text-sm text-slate-700 dark:text-slate-300">
              All day
            </label>
          </div>

          {/* Time Zone */}
          <TimeZonePicker
            value={formData.timeZone || ''}
            onChange={(timeZone) => setFormData({ ...formData, timeZone })}
            eventDate={formData.startTS ? new Date(formData.startTS * 1000) : undefined}
          />

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
              placeholder="Event location"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition resize-none"
              placeholder="Event description"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Palette className="w-4 h-4 inline mr-1" />
              Event Type
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: parseInt(e.target.value) })}
              className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
            >
              {eventTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.title}
                </option>
              ))}
            </select>
          </div>

          {/* Recurrence */}
          <RecurrencePicker
            recurrence={getCurrentRecurrence()}
            onChange={handleRecurrenceChange}
            eventStartDate={getEventStartDate()}
          />

          {/* Reminders */}
          <RemindersPicker
            reminders={getCurrentReminders()}
            onChange={handleRemindersChange}
          />

          {/* Attendees */}
          <AttendeesPicker
            attendees={formData.attendees || []}
            onChange={(attendees) => setFormData({ ...formData, attendees })}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/40">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-700 text-white font-medium hover:from-sky-700 hover:to-indigo-800 active:scale-[0.99] transition shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : event ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

