'use client'

import { useState, useEffect } from 'react'
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
    <div className={`space-y-3 ${className}`}>
      {/* Compact Title */}
      <div className="mb-2">
        <h2 className="text-[14px] font-bold tracking-tight text-slate-900 mb-0.5">
          How demanding was your shift?
        </h2>
        <p className="text-[11px] text-slate-500 leading-tight">
          Select to adjust calorie targets
        </p>
      </div>

      {/* Compact Activity Level Buttons */}
      <div className="grid grid-cols-1 gap-1.5">
        {(Object.keys(ACTIVITY_LEVELS) as ShiftActivityLevel[]).map((level) => {
          const details = ACTIVITY_LEVELS[level]
          const isSelected = selectedLevel === level
          
          return (
            <button
              key={level}
              type="button"
              onClick={() => handleSelect(level)}
              disabled={saving}
              className={`
                relative overflow-hidden rounded-xl px-3.5 py-2.5 text-left
                transition-all duration-200
                ${isSelected
                  ? 'bg-gradient-to-br from-indigo-500/10 via-indigo-50/80 to-indigo-100/60 border border-indigo-400/40 shadow-[0_2px_8px_rgba(99,102,241,0.15)]'
                  : 'bg-white/60 backdrop-blur-sm border border-slate-200/40 hover:border-slate-300/60 hover:bg-white/80 hover:shadow-sm'
                }
                ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer active:scale-[0.99]'}
              `}
            >
              {/* Premium selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_2px_6px_rgba(99,102,241,0.4)] ring-2 ring-indigo-200/50">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}

              <div className="pr-7">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className={`text-[13px] font-bold tracking-tight leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                    {details.label}
                  </h3>
                </div>
                <p className={`text-[10.5px] leading-tight ${isSelected ? 'text-indigo-700/90' : 'text-slate-600'}`}>
                  {details.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Compact Impact Display */}
      {selectedLevel && (
        <div className="rounded-xl bg-gradient-to-br from-slate-50/90 via-white/70 to-slate-50/80 backdrop-blur-sm border border-slate-200/50 p-3.5 space-y-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">
              Impact
            </span>
            <span className="text-[12px] font-bold text-slate-900">
              {activityImpact}
            </span>
          </div>
          
          {estimatedCalories > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">
                Extra Calories
              </span>
              <span className="text-[12px] font-bold text-slate-900">
                +{estimatedCalories} kcal
              </span>
            </div>
          )}

          {recoverySuggestion && (
            <div className="pt-1.5 border-t border-slate-200/50">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1">
                Recovery
              </p>
              <p className="text-[11px] text-slate-700 leading-tight">
                {recoverySuggestion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

