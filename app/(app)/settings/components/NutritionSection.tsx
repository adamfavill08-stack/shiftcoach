'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { SettingsCard, SettingsRow } from '@/components/settings/SettingsCard'
import { SettingsSelect } from '@/components/settings/SettingsSelect'

export function NutritionSection() {
  const { settings, saving, saveField, loading } = useSettings()
  const [isOpen, setIsOpen] = useState(false)

  if (loading) {
    return (
      <div>
        <div className="animate-pulse text-xs text-slate-500">Loading...</div>
      </div>
    )
  }

  const safeSettings = settings || {
    default_activity_level: 'medium' as const,
    calorie_adjustment_aggressiveness: 'balanced' as const,
    macro_split_preset: 'balanced' as const,
  }

  const activityLevelLabel = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  }[safeSettings.default_activity_level || 'medium'] || 'Medium'

  const calorieAdjustmentLabel = {
    gentle: 'Gentle',
    balanced: 'Balanced',
    aggressive: 'Aggressive',
  }[safeSettings.calorie_adjustment_aggressiveness || 'balanced'] || 'Balanced'

  const macroSplitLabel = {
    balanced: 'Balanced',
    high_protein: 'High Protein',
    custom: 'Custom',
  }[safeSettings.macro_split_preset || 'balanced'] || 'Balanced'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 hover:bg-white/70 transition-colors w-full"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-xl bg-white/60 border border-slate-200/50 grid place-items-center flex-shrink-0">
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-800">Nutrition</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
        )}
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 mx-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-[0_4px_12px_rgba(0,0,0,0.08)] p-4 space-y-3 z-20">
            <SettingsRow
              label="Activity Level"
              description="Your typical shift intensity level."
              right={
                <SettingsSelect
                  value={safeSettings.default_activity_level || 'medium'}
                  onChange={(value) => {
                    if (settings) saveField('default_activity_level', value as 'low' | 'medium' | 'high')
                  }}
                  onSave={async () => {
                    if (!settings) return false
                    return saveField('default_activity_level', safeSettings.default_activity_level || 'medium', false)
                  }}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]}
                  saving={saving === 'default_activity_level'}
                />
              }
            />

            <SettingsRow
              label="Calorie Adjustment"
              description="How aggressively calories adjust to your activity."
              right={
                <SettingsSelect
                  value={safeSettings.calorie_adjustment_aggressiveness || 'balanced'}
                  onChange={(value) => {
                    if (settings) saveField('calorie_adjustment_aggressiveness', value as 'gentle' | 'balanced' | 'aggressive')
                  }}
                  onSave={async () => {
                    if (!settings) return false
                    return saveField('calorie_adjustment_aggressiveness', safeSettings.calorie_adjustment_aggressiveness || 'balanced', false)
                  }}
                  options={[
                    { value: 'gentle', label: 'Gentle' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'aggressive', label: 'Aggressive' },
                  ]}
                  saving={saving === 'calorie_adjustment_aggressiveness'}
                />
              }
            />

            <SettingsRow
              label="Macro Split"
              description="Your preferred macronutrient distribution."
              right={
                <SettingsSelect
                  value={safeSettings.macro_split_preset || 'balanced'}
                  onChange={(value) => {
                    if (settings) saveField('macro_split_preset', value as 'balanced' | 'high_protein' | 'custom')
                  }}
                  onSave={async () => {
                    if (!settings) return false
                    return saveField('macro_split_preset', safeSettings.macro_split_preset || 'balanced', false)
                  }}
                  options={[
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'high_protein', label: 'High Protein' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                  saving={saving === 'macro_split_preset'}
                />
              }
            />
        </div>
      )}
    </div>
  )
}
