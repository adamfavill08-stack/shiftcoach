'use client'

import { useState } from 'react'
import { Repeat, Calendar, X } from 'lucide-react'
import {
  REPEAT_SAME_DAY,
  REPEAT_ORDER_WEEKDAY,
  REPEAT_ORDER_WEEKDAY_USE_LAST,
  REPEAT_LAST_DAY,
} from '@/lib/models/calendar/Event'

export interface RecurrenceConfig {
  interval: number // 0 = no repeat, otherwise seconds (DAY, WEEK, MONTH, YEAR)
  rule: number // REPEAT_SAME_DAY, REPEAT_ORDER_WEEKDAY, etc.
  limit: number // 0 = no limit, otherwise end date timestamp
}

interface RecurrencePickerProps {
  recurrence: RecurrenceConfig
  onChange: (recurrence: RecurrenceConfig) => void
  eventStartDate: Date
}

// Constants for intervals (in seconds)
const DAY = 86400
const WEEK = 604800
const MONTH = 2592000 // Approximate
const YEAR = 31536000 // Approximate

const REPEAT_OPTIONS = [
  { label: 'Does not repeat', value: 0 },
  { label: 'Daily', value: DAY },
  { label: 'Weekly', value: WEEK },
  { label: 'Monthly', value: MONTH },
  { label: 'Yearly', value: YEAR },
]

const MONTHLY_RULE_OPTIONS = [
  { label: 'Same day each month', value: REPEAT_SAME_DAY },
  { label: 'Same weekday (e.g., 1st Monday)', value: REPEAT_ORDER_WEEKDAY },
  { label: 'Last weekday of month', value: REPEAT_ORDER_WEEKDAY_USE_LAST },
  { label: 'Last day of month', value: REPEAT_LAST_DAY },
]

const YEARLY_RULE_OPTIONS = [
  { label: 'Same date each year', value: REPEAT_SAME_DAY },
  { label: 'Same weekday (e.g., 1st Monday of January)', value: REPEAT_ORDER_WEEKDAY },
  { label: 'Last weekday of month', value: REPEAT_ORDER_WEEKDAY_USE_LAST },
]

export function RecurrencePicker({ recurrence, onChange, eventStartDate }: RecurrencePickerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customInterval, setCustomInterval] = useState('')
  const [endDate, setEndDate] = useState<string>('')
  const [repeatCount, setRepeatCount] = useState<string>('')

  const isRepeating = recurrence.interval !== 0

  function handleIntervalChange(interval: number) {
    let rule = recurrence.rule
    
    // Set default rule based on interval
    if (interval === MONTH) {
      rule = REPEAT_SAME_DAY
    } else if (interval === YEAR) {
      rule = REPEAT_SAME_DAY
    } else {
      rule = 0
    }
    
    onChange({
      interval,
      rule,
      limit: recurrence.limit,
    })
  }

  function handleRuleChange(rule: number) {
    onChange({
      ...recurrence,
      rule,
    })
  }

  function handleEndDateChange(date: string) {
    const timestamp = date ? Math.floor(new Date(date).getTime() / 1000) : 0
    onChange({
      ...recurrence,
      limit: timestamp,
    })
    setEndDate(date)
  }

  function handleRepeatCountChange(count: string) {
    setRepeatCount(count)
    if (count && parseInt(count) > 0) {
      // Calculate end date based on count
      const countNum = parseInt(count)
      const intervalSeconds = recurrence.interval
      const endTimestamp = eventStartDate.getTime() / 1000 + (intervalSeconds * countNum)
      onChange({
        ...recurrence,
        limit: endTimestamp,
      })
    } else {
      onChange({
        ...recurrence,
        limit: 0,
      })
    }
  }

  function getIntervalLabel(interval: number): string {
    const option = REPEAT_OPTIONS.find(opt => opt.value === interval)
    return option?.label || 'Custom'
  }

  function getRuleLabel(rule: number, interval: number): string {
    if (interval === MONTH) {
      const option = MONTHLY_RULE_OPTIONS.find(opt => opt.value === rule)
      return option?.label || 'Same day each month'
    } else if (interval === YEAR) {
      const option = YEARLY_RULE_OPTIONS.find(opt => opt.value === rule)
      return option?.label || 'Same date each year'
    }
    return ''
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Repeat className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Repeat
        </label>
      </div>

      {/* Basic Repeat Selection */}
      <div>
        <select
          value={recurrence.interval}
          onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
          className="w-full rounded-xl px-3 py-2.5 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50 transition text-sm"
        >
          {REPEAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Advanced Options (when repeating) */}
      {isRepeating && (
        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-3">
          {/* Monthly/Yearly Rule Selection */}
          {(recurrence.interval === MONTH || recurrence.interval === YEAR) && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Pattern
              </label>
              <select
                value={recurrence.rule}
                onChange={(e) => handleRuleChange(parseInt(e.target.value))}
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              >
                {(recurrence.interval === MONTH ? MONTHLY_RULE_OPTIONS : YEARLY_RULE_OPTIONS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* End Date / Repeat Count */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              End Repeat
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="radio"
                  name="endType"
                  checked={recurrence.limit === 0}
                  onChange={() => {
                    onChange({ ...recurrence, limit: 0 })
                    setEndDate('')
                    setRepeatCount('')
                  }}
                  className="w-4 h-4 text-sky-600 dark:text-sky-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Never</span>
              </label>
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="radio"
                  name="endType"
                  checked={recurrence.limit !== 0 && endDate !== ''}
                  onChange={() => {
                    if (!endDate) {
                      const defaultEndDate = new Date(eventStartDate)
                      defaultEndDate.setMonth(defaultEndDate.getMonth() + 1)
                      setEndDate(defaultEndDate.toISOString().split('T')[0])
                    }
                  }}
                  className="w-4 h-4 text-sky-600 dark:text-sky-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">On date</span>
              </label>
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="radio"
                  name="endType"
                  checked={recurrence.limit !== 0 && repeatCount !== ''}
                  onChange={() => {
                    if (!repeatCount) {
                      setRepeatCount('10')
                      handleRepeatCountChange('10')
                    }
                  }}
                  className="w-4 h-4 text-sky-600 dark:text-sky-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">After</span>
              </label>
            </div>

            {/* End Date Input */}
            {recurrence.limit !== 0 && endDate !== '' && (
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                min={eventStartDate.toISOString().split('T')[0]}
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              />
            )}

            {/* Repeat Count Input */}
            {recurrence.limit !== 0 && repeatCount !== '' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={repeatCount}
                  onChange={(e) => handleRepeatCountChange(e.target.value)}
                  className="w-20 rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  occurrences
                </span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/40">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Pattern:</span> {getIntervalLabel(recurrence.interval)}
              {recurrence.interval === MONTH || recurrence.interval === YEAR ? ` • ${getRuleLabel(recurrence.rule, recurrence.interval)}` : ''}
              {recurrence.limit === 0 ? ' • No end date' : endDate ? ` • Ends ${new Date(recurrence.limit * 1000).toLocaleDateString()}` : repeatCount ? ` • ${repeatCount} times` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

