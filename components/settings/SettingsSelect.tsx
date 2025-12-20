'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SettingsSelectProps {
  value: string | null | undefined
  onChange: (value: string) => void
  onSave?: () => Promise<boolean>
  options: SelectOption[]
  disabled?: boolean
  saving?: boolean
  className?: string
}

export function SettingsSelect({
  value,
  onChange,
  onSave,
  options,
  disabled = false,
  saving = false,
  className = '',
}: SettingsSelectProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setShowSuccess(false)

    if (onSave) {
      setIsSaving(true)
      const success = await onSave()
      setIsSaving(false)
      if (success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    }
  }

  const isLoading = saving || isSaving
  const displayValue = value || options[0]?.value || ''

  return (
    <div className="relative flex items-center gap-1.5">
      <select
        value={displayValue}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className={`
          rounded-full border px-3 py-1 text-[11px]
          focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-400/50
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          bg-white/70 dark:bg-slate-800/50
          border-slate-200/60 dark:border-slate-700/40
          text-slate-900 dark:text-slate-100
          ${className}
        `}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500" />
      )}
      {showSuccess && !isLoading && (
        <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
      )}
    </div>
  )
}

