'use client'

import { useState, useMemo } from 'react'
import { Globe, Clock } from 'lucide-react'

interface TimeZonePickerProps {
  value: string
  onChange: (timeZone: string) => void
  eventDate?: Date
}

// Common time zones grouped by region
const TIME_ZONES = [
  { group: 'UTC', zones: [{ value: 'UTC', label: 'UTC (Coordinated Universal Time)' }] },
  {
    group: 'North America',
    zones: [
      { value: 'America/New_York', label: 'Eastern Time (ET)' },
      { value: 'America/Chicago', label: 'Central Time (CT)' },
      { value: 'America/Denver', label: 'Mountain Time (MT)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
      { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    ],
  },
  {
    group: 'Europe',
    zones: [
      { value: 'Europe/London', label: 'London (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
      { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
      { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
      { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
      { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)' },
      { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
    ],
  },
  {
    group: 'Asia',
    zones: [
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
      { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
      { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
      { value: 'Asia/Dubai', label: 'Dubai (GST)' },
      { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)' },
      { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
      { value: 'Asia/Seoul', label: 'Seoul (KST)' },
    ],
  },
  {
    group: 'Australia & Pacific',
    zones: [
      { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
      { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
      { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
      { value: 'Australia/Perth', label: 'Perth (AWST)' },
      { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
    ],
  },
  {
    group: 'South America',
    zones: [
      { value: 'America/Sao_Paulo', label: 'São Paulo (BRT/BRST)' },
      { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)' },
      { value: 'America/Lima', label: 'Lima (PET)' },
      { value: 'America/Santiago', label: 'Santiago (CLT/CLST)' },
    ],
  },
]

export function TimeZonePicker({ value, onChange, eventDate }: TimeZonePickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  // Get user's local timezone
  const localTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  // Filter time zones based on search
  const filteredTimeZones = useMemo(() => {
    if (!searchQuery.trim()) {
      return TIME_ZONES
    }

    const query = searchQuery.toLowerCase()
    return TIME_ZONES.map(group => ({
      ...group,
      zones: group.zones.filter(zone =>
        zone.label.toLowerCase().includes(query) ||
        zone.value.toLowerCase().includes(query)
      ),
    })).filter(group => group.zones.length > 0)
  }, [searchQuery])

  // Get current time in selected timezone
  const currentTimeInZone = useMemo(() => {
    if (!value) return null
    try {
      const date = eventDate || new Date()
      return new Intl.DateTimeFormat('en-US', {
        timeZone: value,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date)
    } catch {
      return null
    }
  }, [value, eventDate])

  // Get timezone offset
  const timezoneOffset = useMemo(() => {
    if (!value) return null
    try {
      const date = eventDate || new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: value,
        timeZoneName: 'short',
      })
      const parts = formatter.formatToParts(date)
      const tzName = parts.find(p => p.type === 'timeZoneName')?.value
      return tzName || null
    } catch {
      return null
    }
  }, [value, eventDate])

  function handleSelectTimeZone(tz: string) {
    onChange(tz)
    setShowPicker(false)
    setSearchQuery('')
  }

  const selectedLabel = TIME_ZONES
    .flatMap(g => g.zones)
    .find(z => z.value === value)?.label || value || 'Use device timezone'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Time Zone
        </label>
      </div>

      {/* Selected Timezone Display */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full rounded-xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-left hover:bg-white/90 dark:hover:bg-slate-800/70 transition"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {selectedLabel}
            </p>
            {value && currentTimeInZone && (
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentTimeInZone} {timezoneOffset && `(${timezoneOffset})`}
                </p>
              </div>
            )}
            {!value && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {localTimeZone}
              </p>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${showPicker ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Timezone Picker Dropdown */}
      {showPicker && (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 shadow-lg max-h-64 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-slate-200/50 dark:border-slate-700/40">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search time zones..."
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              autoFocus
            />
          </div>

          {/* Timezone List */}
          <div className="overflow-y-auto flex-1">
            {/* Use Device Timezone Option */}
            <button
              type="button"
              onClick={() => handleSelectTimeZone('')}
              className={`w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition ${
                !value ? 'bg-sky-50 dark:bg-sky-950/30' : ''
              }`}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Use device timezone
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {localTimeZone}
              </p>
            </button>

            {/* Timezone Groups */}
            {filteredTimeZones.map((group) => (
              <div key={group.group} className="border-t border-slate-200/50 dark:border-slate-700/40">
                <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    {group.group}
                  </p>
                </div>
                {group.zones.map((zone) => (
                  <button
                    key={zone.value}
                    type="button"
                    onClick={() => handleSelectTimeZone(zone.value)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition ${
                      value === zone.value ? 'bg-sky-50 dark:bg-sky-950/30' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {zone.label}
                    </p>
                    {value === zone.value && currentTimeInZone && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {currentTimeInZone} {timezoneOffset && `(${timezoneOffset})`}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

