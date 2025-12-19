'use client'

import React, { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { ACTIVITY_LEVELS, type ShiftActivityLevel, getRecoverySuggestion, getEstimatedCaloriesBurned, getActivityImpactLabel } from '@/lib/activity/activityLevels'

type ActivityLevelSelectorProps = {
  currentLevel?: ShiftActivityLevel | null
  weightKg?: number
  onSelect?: (level: ShiftActivityLevel) => void
  className?: string
}

export function ActivityLevelSelector({ 
  currentLevel, 
  weightKg = 75,
  onSelect,
  className = '' 
}: ActivityLevelSelectorProps) {
  const [selectedLevel, setSelectedLevel] = useState<ShiftActivityLevel | null>(currentLevel ?? null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelectedLevel(currentLevel ?? null)
  }, [currentLevel])

  const handleSelect = async (level: ShiftActivityLevel) => {
    setSelectedLevel(level)
    setSaving(true)

    try {
      console.log('[ActivityLevelSelector] Sending request:', { level })
      
      const res = await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_activity_level: level }),
      })

      console.log('[ActivityLevelSelector] Fetch completed:', {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('content-type'),
      })

      const responseText = await res.text().catch((err) => {
        console.error('[ActivityLevelSelector] Failed to read response:', err)
        return ''
      })
      
      console.log('[ActivityLevelSelector] Response body:', {
        length: responseText?.length || 0,
        isEmpty: !responseText || responseText.trim() === '',
        isJson: responseText?.trim().startsWith('{') || responseText?.trim().startsWith('['),
        preview: responseText?.substring(0, 500) || '(empty)',
        fullText: responseText,
      })

      if (!res.ok) {
        // Always include status and statusText in error
        let error: any = { 
          status: res.status,
          statusText: res.statusText,
          _rawResponseText: responseText,
          _timestamp: new Date().toISOString(),
        }
        
        if (!responseText || responseText.trim() === '') {
          error.error = 'Empty response from server'
          error._rawResponseText = '(empty)'
        } else {
          try {
            const parsed = JSON.parse(responseText)
            console.log('[ActivityLevelSelector] Parsed error response:', parsed)
            
            // Always merge parsed data, but ensure we have at least status info
            if (Object.keys(parsed).length === 0) {
              error.error = 'Empty error response from server (returned {})'
              error._parsedWasEmpty = true
              error._originalResponse = responseText
            } else {
              // Merge parsed error with our base error object
              error = { ...error, ...parsed }
              // Ensure we have an error message
              if (!error.error && parsed.message) {
                error.error = parsed.message
              }
              if (!error.error && parsed.details) {
                error.error = parsed.details
              }
            }
          } catch (parseError) {
            console.error('[ActivityLevelSelector] JSON parse error:', parseError)
            error.error = 'Failed to parse error response'
            error.rawResponse = responseText
            error.parseError = parseError instanceof Error ? parseError.message : String(parseError)
          }
        }
        
        // Ensure error object always has at least an 'error' field
        if (!error.error) {
          error.error = `Server returned ${res.status} ${res.statusText}`
        }
        
        // Build a user-friendly error message
        let userMessage = 'Failed to save activity level'
        if (error.error) {
          userMessage = error.error
        } else if (error.message) {
          userMessage = error.message
        } else if (error.details) {
          userMessage = error.details
        }
        
        // Show alert with clear instructions if it's a database schema error
        if (error.errorCode === 'PGRST204' || error.message?.includes('shift_activity_level') || error.message?.includes('Database schema')) {
          const migrationSQL = error.migrationSQL || `DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs' 
    AND column_name = 'shift_activity_level'
  ) THEN
    ALTER TABLE public.activity_logs 
    ADD COLUMN shift_activity_level TEXT 
    CHECK (shift_activity_level IN ('very_light', 'light', 'moderate', 'busy', 'intense'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_level 
ON public.activity_logs(user_id, shift_activity_level) 
WHERE shift_activity_level IS NOT NULL;`
          
          alert(`DATABASE MIGRATION REQUIRED\n\n${userMessage}\n\nTo fix this:\n\n1. Open Supabase Dashboard → SQL Editor\n2. Copy and paste the SQL below\n3. Click Run\n4. Wait 30 seconds\n5. Try again\n\nSQL to run:\n\n${migrationSQL}`)
        }
        
        console.error('[ActivityLevelSelector] Failed to save:', {
          status: res.status,
          statusText: res.statusText,
          error,
          responseText: responseText || '(empty)',
          responseTextLength: responseText?.length || 0,
          level,
          errorKeys: Object.keys(error),
          userMessage,
        })
        // Revert selection on error
        setSelectedLevel(currentLevel ?? null)
        return
      }

      // Parse successful response
      let responseData: any = {}
      try {
        if (responseText) {
          responseData = JSON.parse(responseText)
        }
      } catch (parseError) {
        console.warn('[ActivityLevelSelector] Failed to parse success response:', parseError)
      }

      // Success - trigger callback if provided
      if (onSelect) {
        onSelect(level)
      }

      // Dispatch event for other components to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('activity-level-updated', { detail: { level } }))
      }
    } catch (err) {
      console.error('[ActivityLevelSelector] Error saving activity level:', err)
      // Revert selection on error
      setSelectedLevel(currentLevel ?? null)
    } finally {
      setSaving(false)
    }
  }

  const selectedDetails = selectedLevel ? ACTIVITY_LEVELS[selectedLevel] : null
  const estimatedCalories = selectedLevel ? getEstimatedCaloriesBurned(selectedLevel, weightKg) : 0
  const recoverySuggestion = selectedLevel ? getRecoverySuggestion(selectedLevel) : null
  const activityImpact = selectedLevel ? getActivityImpactLabel(selectedLevel) : 'Not set'

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Editorial Header */}
      <div>
        <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">
          How demanding was your shift?
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Select to adjust calorie targets
        </p>
      </div>

      {/* Soft Activity Level Rows */}
      <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-2">
        {(Object.keys(ACTIVITY_LEVELS) as ShiftActivityLevel[]).map((level, index) => {
          const details = ACTIVITY_LEVELS[level]
          const isSelected = selectedLevel === level
          
          return (
            <React.Fragment key={level}>
              <button
                type="button"
                onClick={() => handleSelect(level)}
                disabled={saving}
                className={`
                  w-full group flex items-start gap-3 rounded-2xl px-4 py-3 text-left
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-slate-100/60 border border-slate-300/50'
                    : 'bg-slate-50/35 border border-slate-200/30 hover:bg-white/70 hover:border-slate-200/50'
                  }
                  ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                `}
              >
                {/* Check icon badge */}
                <div className={`
                  mt-0.5 h-7 w-7 rounded-full grid place-items-center flex-shrink-0
                  ${isSelected
                    ? 'bg-emerald-500/20 border border-emerald-300/50'
                    : 'bg-white/70 border border-slate-200/60'
                  }
                `}>
                  {isSelected ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                    {details.label}
                  </h4>
                  <p className={`mt-1 text-sm leading-relaxed ${isSelected ? 'text-slate-600' : 'text-slate-500'}`}>
                    {details.description}
                  </p>
                </div>
              </button>
              {index < (Object.keys(ACTIVITY_LEVELS).length - 1) && (
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent my-2" />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Impact Display */}
      {selectedLevel && (
        <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-50/70 to-white border border-slate-200/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
              Impact
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {activityImpact}
            </span>
          </div>
          
          {estimatedCalories > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Extra Calories
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                +{estimatedCalories} kcal
              </span>
            </div>
          )}

          {recoverySuggestion && (
            <div className="pt-3 border-t border-slate-200/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.12em] mb-2">
                Recovery
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {recoverySuggestion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

