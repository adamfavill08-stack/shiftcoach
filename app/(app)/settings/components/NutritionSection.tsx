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
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-white/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent to-transparent" />
      <div className="relative z-10">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/50 transition-all"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/60 shadow-sm">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-[12px] font-semibold text-slate-900 leading-snug">Nutrition</h3>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          )}
        </button>
        {isOpen && (
          <div className="px-5 pb-3 space-y-1">
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
    </div>
  )
}
