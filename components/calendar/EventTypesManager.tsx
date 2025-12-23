'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Save, Loader2 } from 'lucide-react'
import { EventType, OTHER_EVENT, REGULAR_EVENT_TYPE_ID } from '@/lib/models/calendar/EventType'
import { ColorPicker, COLOR_PRESETS, intColorToHex, hexToIntColor } from './ColorPicker'

interface EventTypesManagerProps {
  onClose?: () => void
}

export function EventTypesManager({ onClose }: EventTypesManagerProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formColor, setFormColor] = useState(COLOR_PRESETS[0].intValue)
  const [formType, setFormType] = useState(OTHER_EVENT)

  useEffect(() => {
    loadEventTypes()
  }, [])

  async function loadEventTypes() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/calendar/event-types')
      if (!response.ok) {
        let message = 'Event types are temporarily unavailable.'
        try {
          const details = await response.json()
          if (details?.error) {
            message = details.error
          }
        } catch {
          // ignore parse issues
        }
        setError(message)
        setEventTypes([])
        return
      }
      const data = await response.json()
      setEventTypes(data.eventTypes || [])
    } catch (err: any) {
      setError(err.message || 'Event types are temporarily unavailable.')
      console.error('Error loading event types:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      setError('Title is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const eventTypeData = {
        title: formTitle.trim(),
        color: formColor,
        caldavCalendarId: 0,
        caldavDisplayName: '',
        caldavEmail: '',
        type: formType,
      }

      let response
      if (editingId) {
        // Update existing
        response = await fetch(`/api/calendar/event-types/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventTypeData),
        })
      } else {
        // Create new
        response = await fetch('/api/calendar/event-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventTypeData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save event type')
      }

      // Reset form
      setFormTitle('')
      setFormColor(COLOR_PRESETS[0].intValue)
      setFormType(OTHER_EVENT)
      setEditingId(null)
      setShowAddForm(false)

      // Reload list
      await loadEventTypes()
    } catch (err: any) {
      setError(err.message)
      console.error('Error saving event type:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this event type? Events using this type will need to be reassigned.')) {
      return
    }

    try {
      setError(null)
      const response = await fetch(`/api/calendar/event-types/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete event type')
      }

      await loadEventTypes()
    } catch (err: any) {
      setError(err.message)
      console.error('Error deleting event type:', err)
    }
  }

  function handleEdit(eventType: EventType) {
    setFormTitle(eventType.title)
    setFormColor(eventType.color)
    setFormType(eventType.type)
    setEditingId(eventType.id || null)
    setShowAddForm(true)
    setError(null)
  }

  function handleCancel() {
    setFormTitle('')
    setFormColor(COLOR_PRESETS[0].intValue)
    setFormType(OTHER_EVENT)
    setEditingId(null)
    setShowAddForm(false)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Event Types</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage event categories and colors
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => {
              handleCancel()
              setShowAddForm(true)
            }}
            className="h-9 px-4 rounded-xl bg-slate-900 text-slate-50 text-sm font-medium
                       shadow-[0_14px_30px_rgba(15,23,42,0.6)]
                       hover:bg-slate-900/95 hover:shadow-[0_18px_40px_rgba(15,23,42,0.75)]
                       active:scale-[0.98] transition-colors transition-transform flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Type
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-2xl bg-gradient-to-r from-red-50/80 via-rose-50/80 to-red-50/80 dark:from-red-950/30 dark:via-rose-950/25 dark:to-red-950/30 border border-red-200/80 dark:border-red-800/60 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-red-600 dark:text-red-300">{error}</p>
          <p className="mt-1 text-[11px] text-red-500/80 dark:text-red-400/80">
            You can still use default event colours while this is unavailable.
          </p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {editingId ? 'Edit Event Type' : 'New Event Type'}
            </h4>
            <button
              onClick={handleCancel}
              className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Work, Personal, Birthday"
                className="w-full rounded-xl px-3 py-2.5 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50 focus:border-sky-300/60 dark:focus:border-sky-600/60 transition text-sm"
              />
            </div>

            {/* Color Picker */}
            <ColorPicker
              selectedColor={formColor}
              onColorChange={setFormColor}
              label="Color"
              compact={false}
            />

            {/* Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Category
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2.5 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50 focus:border-sky-300/60 dark:focus:border-sky-600/60 transition text-sm"
              >
                <option value={OTHER_EVENT}>Other</option>
                <option value={1}>Regular Event</option>
                <option value={2}>Birthday</option>
                <option value={3}>Anniversary</option>
                <option value={4}>Holiday</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCancel}
                className="flex-1 h-10 rounded-xl px-4 bg-slate-100/90 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formTitle.trim()}
                className="flex-1 h-10 rounded-xl px-4 bg-slate-900 text-slate-50 text-sm font-medium
                           shadow-[0_14px_30px_rgba(15,23,42,0.6)]
                           hover:bg-slate-900/95 hover:shadow-[0_18px_40px_rgba(15,23,42,0.75)]
                           active:scale-[0.98] transition-colors transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Types List */}
      {!showAddForm && (
        <div className="space-y-2">
          {eventTypes.length === 0 ? (
            <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No event types yet. Create one to get started.
              </p>
            </div>
          ) : (
            eventTypes.map((eventType) => {
              const colorHex = intColorToHex(eventType.color)
              const isDefault = eventType.id === REGULAR_EVENT_TYPE_ID

              return (
                <div
                  key={eventType.id}
                  className="rounded-xl bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/50 dark:border-slate-700/40 p-3 hover:bg-white/90 dark:hover:bg-slate-800/70 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Color indicator */}
                      <div
                        className="h-8 w-8 rounded-full border-2 border-slate-200/50 dark:border-slate-700/40 flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: colorHex }}
                      />
                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {eventType.title}
                        </p>
                        {isDefault && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Default type
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    {!isDefault && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(eventType)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
                          aria-label="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eventType.id && handleDelete(eventType.id)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

