'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { ToastContainer } from '@/components/ui/Toast'
import { ProfilePlanSection } from './components/ProfilePlanSection'
import { NotificationsSection } from './components/NotificationsSection'
import { NutritionSection } from './components/NutritionSection'
import { LanguageSection } from './components/LanguageSection'
import { DataPrivacySection } from './components/DataPrivacySection'
import { TesterFeedbackSection } from './components/TesterFeedbackSection'
import { useTranslation } from '@/components/providers/language-provider'

export default function SettingsPage() {
  const router = useRouter()
  const { loading } = useSettings()
  const { t } = useTranslation()

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] px-6 py-5">
          <div className="animate-pulse text-sm text-slate-500">Loading settings...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-start justify-center px-4 py-6 pb-20 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white pb-4">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center rounded-full w-8 h-8 text-slate-500 hover:bg-sky-50 hover:text-slate-900 transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900">
              {t('settings.title')}
            </h1>
            <div className="w-8" />
          </div>

          {/* Settings Sections */}
          <div className="divide-y divide-slate-100">
            {/* Account Section */}
            <section className="pt-3">
              <p className="px-4 pb-1 text-[11px] font-semibold tracking-wide text-sky-600 uppercase">
                {t('settings.section.account')}
              </p>
              <div className="space-y-1 px-2 pb-2">
                <ProfilePlanSection />
              </div>
            </section>

            {/* Preferences Section */}
            <section className="pt-3">
              <p className="px-4 pb-1 text-[11px] font-semibold tracking-wide text-sky-600 uppercase">
                {t('settings.section.preferences')}
              </p>
              <div className="space-y-1 px-2 pb-2">
                <NotificationsSection />
                <NutritionSection />
                <LanguageSection />
              </div>
            </section>

            {/* Support Section */}
            <section className="pt-3">
              <p className="px-4 pb-1 text-[11px] font-semibold tracking-wide text-sky-600 uppercase">
                {t('settings.section.support')}
              </p>
              <div className="space-y-1 px-2 pb-3">
                <TesterFeedbackSection />
                <DataPrivacySection />
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-4 pt-3 border-t border-slate-100">
            <p className="text-xs text-center text-slate-500">
              Version 1.0 ·{' '}
              <span className="text-sky-600 cursor-pointer hover:text-sky-700 hover:underline transition-colors">
                Contact support
              </span>
            </p>
          </div>
        </div>
      </div>
      <ToastContainer />
    </main>
  )
}
