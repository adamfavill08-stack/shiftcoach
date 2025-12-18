'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface SettingsInputProps {
  value: number | string | null
  onChange: (value: number | string) => void
  onSave?: () => Promise<boolean>
  type?: 'number' | 'text'
  placeholder?: string
  unit?: string
  min?: number
  max?: number
  disabled?: boolean
  saving?: boolean
  className?: string
}

export function SettingsInput({
  value,
  onChange,
  onSave,
  type = 'text',
  placeholder,
  unit,
  min,
  max,
  disabled = false,
  saving = false,
  className = '',
}: SettingsInputProps) {
  const [localValue, setLocalValue] = useState(value?.toString() || '')
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    setLocalValue(value?.toString() || '')
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    setShowSuccess(false)

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // If onSave provided, debounce the save
    if (onSave) {
      saveTimeoutRef.current = setTimeout(async () => {
        const parsedValue = type === 'number' ? parseFloat(newValue) : newValue
        if (parsedValue !== null && parsedValue !== '') {
          setIsSaving(true)
          const success = await onSave()
          setIsSaving(false)
          if (success) {
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 2000)
          }
        }
      }, 1000)
    } else {
      // Immediate update if no save handler
      const parsedValue = type === 'number' ? parseFloat(newValue) : newValue
      if (parsedValue !== null && parsedValue !== '') {
        onChange(parsedValue)
      }
    }
  }

  const handleBlur = () => {
    // Validate on blur
    if (type === 'number') {
      const num = parseFloat(localValue)
      if (isNaN(num)) {
        setLocalValue(value?.toString() || '')
        return
      }
      if (min !== undefined && num < min) {
        setLocalValue(min.toString())
        onChange(min)
      } else if (max !== undefined && num > max) {
        setLocalValue(max.toString())
        onChange(max)
      }
    }
  }

  const displayValue = localValue || ''
  const isLoading = saving || isSaving

  return (
    <div className="relative flex items-center gap-2">
      <input
        type={type}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled || isLoading}
        placeholder={placeholder}
        min={min}
        max={max}
        className={`
          w-20 rounded-full border px-3 py-1 text-xs
          focus:outline-none focus:ring-2 focus:ring-sky-400/50
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          ${className}
        `}
        style={{
          backgroundColor: 'var(--card-subtle)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
        }}
      />
      {unit && (
        <span className="text-xs" style={{ color: 'var(--text-soft)' }}>
          {unit}
        </span>
      )}
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-soft)' }} />
      )}
      {showSuccess && !isLoading && (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      )}
    </div>
  )
}

