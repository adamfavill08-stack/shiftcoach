'use client'

import { Check } from 'lucide-react'

export type ColorPreset = {
  id: string
  label: string
  value: string
  // For Simple Calendar Pro compatibility, we also store as integer (ARGB format)
  // Android uses integer colors: 0xAARRGGBB format
  intValue: number
}

// Color presets matching Simple Calendar Pro's default colors
// Colors are in ARGB format (Android integer colors)
// We convert hex to ARGB: 0xFF + RGB
export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'blue', label: 'Blue', value: '#3B82F6', intValue: 0xFF3B82F6 },
  { id: 'red', label: 'Red', value: '#EF4444', intValue: 0xFFEF4444 },
  { id: 'green', label: 'Green', value: '#22C55E', intValue: 0xFF22C55E },
  { id: 'yellow', label: 'Yellow', value: '#FACC15', intValue: 0xFFFACC15 },
  { id: 'purple', label: 'Purple', value: '#A855F7', intValue: 0xFFA855F7 },
  { id: 'teal', label: 'Teal', value: '#06B6D4', intValue: 0xFF06B6D4 },
  { id: 'orange', label: 'Orange', value: '#F97316', intValue: 0xFFF97316 },
  { id: 'pink', label: 'Pink', value: '#EC4899', intValue: 0xFFEC4899 },
  { id: 'indigo', label: 'Indigo', value: '#6366F1', intValue: 0xFF6366F1 },
  { id: 'cyan', label: 'Cyan', value: '#14B8A6', intValue: 0xFF14B8A6 },
  { id: 'emerald', label: 'Emerald', value: '#10B981', intValue: 0xFF10B981 },
  { id: 'rose', label: 'Rose', value: '#F43F5E', intValue: 0xFFF43F5E },
  { id: 'amber', label: 'Amber', value: '#F59E0B', intValue: 0xFFF59E0B },
  { id: 'violet', label: 'Violet', value: '#8B5CF6', intValue: 0xFF8B5CF6 },
  { id: 'slate', label: 'Slate', value: '#64748B', intValue: 0xFF64748B },
]

// Convert integer color (ARGB) to hex string
export function intColorToHex(intColor: number): string {
  // Remove alpha channel and convert to hex
  const rgb = intColor & 0x00FFFFFF
  return `#${rgb.toString(16).padStart(6, '0').toUpperCase()}`
}

// Convert hex string to integer color (ARGB)
export function hexToIntColor(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace('#', '')
  const rgb = parseInt(cleanHex, 16)
  // Add alpha channel (0xFF = fully opaque)
  return 0xFF000000 | rgb
}

// Find preset by integer color value
export function findPresetByIntColor(intColor: number): ColorPreset | undefined {
  return COLOR_PRESETS.find(preset => preset.intValue === intColor)
}

// Find preset by hex color value
export function findPresetByHexColor(hex: string): ColorPreset | undefined {
  return COLOR_PRESETS.find(preset => preset.value.toLowerCase() === hex.toLowerCase())
}

interface ColorPickerProps {
  selectedColor: number // Integer color (ARGB format)
  onColorChange: (color: number) => void
  label?: string
  compact?: boolean
}

export function ColorPicker({ selectedColor, onColorChange, label, compact = false }: ColorPickerProps) {
  const selectedPreset = findPresetByIntColor(selectedColor) || COLOR_PRESETS[0]

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className={`grid ${compact ? 'grid-cols-5' : 'grid-cols-7'} gap-2`}>
        {COLOR_PRESETS.map((preset) => {
          const isSelected = preset.intValue === selectedColor
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onColorChange(preset.intValue)}
              className={`
                relative h-10 w-10 rounded-full border-2 transition-all
                hover:scale-110 active:scale-95
                ${isSelected
                  ? 'border-sky-500 dark:border-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.2)] dark:shadow-[0_0_0_3px_rgba(56,189,248,0.3)]'
                  : 'border-slate-200/70 dark:border-slate-700/50 shadow-[0_2px_6px_rgba(15,23,42,0.08)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.2)]'
                }
              `}
              style={{ backgroundColor: preset.value }}
              aria-label={preset.label}
              title={preset.label}
            >
              {isSelected && (
                <span className="absolute inset-0 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      {!compact && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          Selected: <span className="font-medium">{selectedPreset.label}</span>
        </p>
      )}
    </div>
  )
}

