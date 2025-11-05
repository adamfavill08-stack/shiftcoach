'use client'

import { useState, useEffect } from 'react'
import type { SleepHistoryEntry } from '@/lib/hooks/useSleepHistory'

type EditSleepModalProps = {
  entry: SleepHistoryEntry
  onClose: () => void
  onUpdated: (updated: SleepHistoryEntry) => void
}

export function EditSleepModal({ entry, onClose, onUpdated }: EditSleepModalProps) {
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [quality, setQuality] = useState(entry.quality ?? 3)
  const [naps, setNaps] = useState(entry.naps ?? 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Convert ISO timestamps to datetime-local format
    const start = new Date(entry.start_ts)
    const end = new Date(entry.end_ts)

    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForInput = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    setStartTime(formatForInput(start))
    setEndTime(formatForInput(end))
  }, [entry])

  const handleSave = async () => {
    if (!startTime || !endTime) {
      setError('Please provide both start and end times.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Convert datetime-local to ISO strings
      const startISO = new Date(startTime).toISOString()
      const endISO = new Date(endTime).toISOString()

      const res = await fetch(`/api/sleep/log/${entry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: startISO,
          endTime: endISO,
          quality,
          naps,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || data.error || 'Failed to update sleep log')
        setLoading(false)
        return
      }

      // Update the entry with the response
      if (data.sleep_log) {
        onUpdated(data.sleep_log)
      } else {
        // Fallback: refetch or update manually
        onUpdated({
          ...entry,
          start_ts: startISO,
          end_ts: endISO,
          quality,
          naps,
          sleep_hours: (new Date(endISO).getTime() - new Date(startISO).getTime()) / 3600000,
        })
      }
    } catch (err: any) {
      console.error('Update error:', err)
      setError(err?.message || 'Failed to update sleep log')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-4 w-full max-w-sm"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-soft)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>
            Edit Sleep Log
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-main)' }}
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-soft)' }}>
            <span>Start Time</span>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              style={{
                backgroundColor: 'var(--card-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-soft)' }}>
            <span>End Time</span>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              style={{
                backgroundColor: 'var(--card-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </label>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-soft)' }}>
              <span>Quality</span>
              <input
                type="range"
                min={1}
                max={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-32 accent-violet-500"
              />
              <span className="font-medium" style={{ color: 'var(--text-main)' }}>{quality}/5</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-soft)' }}>
              <span>Type:</span>
              <select
                value={naps === 0 ? 'main' : 'nap'}
                onChange={(e) => setNaps(e.target.value === 'nap' ? 1 : 0)}
                className="rounded-lg border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <option value="main">Sleep</option>
                <option value="nap">Nap</option>
              </select>
            </label>
          </div>

          {error && (
            <p className="text-xs text-rose-600">{error}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--card-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

