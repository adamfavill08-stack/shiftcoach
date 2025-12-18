'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface SettingsTimePickerProps {
  value: string | null | undefined // HH:MM format
  onChange: (value: string) => void
  onSave?: () => Promise<boolean>
  disabled?: boolean
  saving?: boolean
}

export function SettingsTimePicker({
  value,
  onChange,
  onSave,
  disabled = false,
  saving = false,
}: SettingsTimePickerProps) {
  const [hours, setHours] = useState('00')
  const [minutes, setMinutes] = useState('00')
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Parse value on mount/change
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':')
      setHours(h || '00')
      setMinutes(m || '00')
    }
  }, [value])

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    setHours(newHours)
    setMinutes(newMinutes)
    const timeString = `${newHours.padStart(2, '0')}:${newMinutes.padStart(2, '0')}`
    onChange(timeString)
    setShowSuccess(false)

    if (onSave) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(async () => {
        setIsSaving(true)
        const success = await onSave()
        setIsSaving(false)
        if (success) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 2000)
        }
      }, 1000)
    }
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

  const isLoading = saving || isSaving

  return (
    <div className="relative flex items-center gap-2">
      <div className="flex items-center gap-1">
        <select
          value={hours}
          onChange={(e) => handleTimeChange(e.target.value, minutes)}
          disabled={disabled || isLoading}
          className="rounded-full border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--card-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
        >
          {hourOptions.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-xs" style={{ color: 'var(--text-soft)' }}>:</span>
        <select
          value={minutes}
          onChange={(e) => handleTimeChange(hours, e.target.value)}
          disabled={disabled || isLoading}
          className="rounded-full border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--card-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
        >
          {minuteOptions.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-soft)' }} />
      )}
      {showSuccess && !isLoading && (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      )}
    </div>
  )
}

