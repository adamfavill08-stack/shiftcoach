'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface ToggleSwitchProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  onSave?: () => Promise<boolean>
  disabled?: boolean
  saving?: boolean
  defaultChecked?: boolean
}

export function ToggleSwitch({ 
  checked: controlledChecked,
  onChange,
  onSave,
  disabled = false,
  saving = false,
  defaultChecked = false 
}: ToggleSwitchProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Use controlled value if provided, otherwise use internal state
  const checked = controlledChecked !== undefined ? controlledChecked : internalChecked

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked
    
    if (onChange) {
      onChange(newChecked)
    } else {
      setInternalChecked(newChecked)
    }
    
    setShowSuccess(false)

    if (onSave) {
      setIsSaving(true)
      const success = await onSave()
      setIsSaving(false)
      if (success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      } else {
        // Revert on failure
        if (onChange) {
          onChange(!newChecked)
        } else {
          setInternalChecked(!newChecked)
        }
      }
    }
  }

  const isLoading = saving || isSaving

  return (
    <div className="relative flex items-center gap-2">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={handleChange}
          disabled={disabled || isLoading}
        />
        <div
          className="h-5 w-9 rounded-full transition-colors disabled:opacity-50"
          style={{
            backgroundColor: checked ? '#10b981' : '#cbd5e1', // emerald-500 for ON, slate-300 for OFF
          }}
        >
          <div
            className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-[2px] ml-[2px]"
            style={{
              transform: checked ? 'translateX(1rem)' : 'translateX(0)',
            }}
          />
        </div>
      </label>
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      )}
      {showSuccess && !isLoading && (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      )}
    </div>
  )
}

