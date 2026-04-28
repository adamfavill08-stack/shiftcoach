'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { SettingsCard, SettingsRow } from '@/components/settings/SettingsCard'
import { SettingsSelect } from '@/components/settings/SettingsSelect'
import { useTranslation } from '@/components/providers/language-provider'
import { useSubscriptionAccess } from '@/lib/hooks/useSubscriptionAccess'
import { canUseFeature } from '@/lib/subscription/features'
import { UpgradeCard } from '@/components/subscription/UpgradeCard'

export function NutritionSection() {
  const { t } = useTranslation()
  const { settings, saving, saveField, loading } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const { isLoading: subscriptionLoading, isPro, plan } = useSubscriptionAccess()
  const hasCalorieProfileAccess = canUseFeature('calorie_profile_settings', { isPro, plan })

  if (loading) {
    return (
      <div>
        <div className="animate-pulse text-xs text-slate-500">{t('settings.nutrition.loading')}</div>
      </div>
    )
  }

  const safeSettings = settings || {
    default_activity_level: 'medium' as const,
    calorie_adjustment_aggressiveness: 'balanced' as const,
    macro_split_preset: 'balanced' as const,
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center flex-shrink-0 shadow-sm">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-900">{t('settings.nutrition.title')}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition flex-shrink-0" strokeWidth={2} />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition flex-shrink-0" strokeWidth={2} />
        )}
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 mx-2 rounded-2xl bg-white border border-slate-100 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] p-4 space-y-3 z-20">
          {!subscriptionLoading && !hasCalorieProfileAccess ? (
            <UpgradeCard
              title="Calorie profile is a Pro feature"
              description="Upgrade to set your calorie profile and unlock adjusted calorie insights."
            />
          ) : (
            <>
          <SettingsRow
            label={t('settings.nutrition.activityLevel')}
            description={t('settings.nutrition.activityLevelDesc')}
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
                  { value: 'low', label: t('settings.nutrition.activity.low') },
                  { value: 'medium', label: t('settings.nutrition.activity.medium') },
                  { value: 'high', label: t('settings.nutrition.activity.high') },
                ]}
                saving={saving === 'default_activity_level'}
              />
            }
          />

          <SettingsRow
            label={t('settings.nutrition.calorieAdjustment')}
            description={t('settings.nutrition.calorieAdjustmentDesc')}
            right={
              <SettingsSelect
                value={safeSettings.calorie_adjustment_aggressiveness || 'balanced'}
                onChange={(value) => {
                  if (settings)
                    saveField(
                      'calorie_adjustment_aggressiveness',
                      value as 'gentle' | 'balanced' | 'aggressive',
                    )
                }}
                onSave={async () => {
                  if (!settings) return false
                  return saveField(
                    'calorie_adjustment_aggressiveness',
                    safeSettings.calorie_adjustment_aggressiveness || 'balanced',
                    false,
                  )
                }}
                options={[
                  { value: 'gentle', label: t('settings.nutrition.calorie.gentle') },
                  { value: 'balanced', label: t('settings.nutrition.calorie.balanced') },
                  { value: 'aggressive', label: t('settings.nutrition.calorie.aggressive') },
                ]}
                saving={saving === 'calorie_adjustment_aggressiveness'}
              />
            }
          />

          <SettingsRow
            label={t('settings.nutrition.macroSplit')}
            description={t('settings.nutrition.macroSplitDesc')}
            right={
              <SettingsSelect
                value={safeSettings.macro_split_preset || 'balanced'}
                onChange={(value) => {
                  if (settings)
                    saveField('macro_split_preset', value as 'balanced' | 'high_protein' | 'custom')
                }}
                onSave={async () => {
                  if (!settings) return false
                  return saveField('macro_split_preset', safeSettings.macro_split_preset || 'balanced', false)
                }}
                options={[
                  { value: 'balanced', label: t('settings.nutrition.macro.balanced') },
                  { value: 'high_protein', label: t('settings.nutrition.macro.highProtein') },
                  { value: 'custom', label: t('settings.nutrition.macro.custom') },
                ]}
                saving={saving === 'macro_split_preset'}
              />
            }
          />
            </>
          )}
        </div>
      )}
    </div>
  )
}
