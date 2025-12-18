'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { ToastContainer } from '@/components/ui/Toast'
import { ProfilePlanSection } from './components/ProfilePlanSection'
import { NotificationsSection } from './components/NotificationsSection'
import { NutritionSection } from './components/NutritionSection'
import { AppearanceSection } from './components/AppearanceSection'
import { AICoachSection } from './components/AICoachSection'
import { DataPrivacySection } from './components/DataPrivacySection'
import { TesterFeedbackSection } from './components/TesterFeedbackSection'
import { SubscriptionPlanSection } from './components/SubscriptionPlanSection'

export default function SettingsPage() {
  const router = useRouter()
  const { loading } = useSettings()

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-4">
        <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-8">
          <div className="animate-pulse text-sm text-slate-500">Loading settings...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Premium Card Container */}
        <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.5)]">
          {/* Premium gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-50/20" />
          
          {/* Enhanced inner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/60" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[15px] ring-1 ring-white/30" />
          
          {/* Ambient glow effect */}
          <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/30 blur-xl opacity-60" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="pt-3 pb-3 px-4 flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center justify-center rounded-full bg-white/90 border border-slate-200/60 w-8 h-8 text-[11px] font-medium text-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.06)] hover:bg-white hover:text-slate-900 transition-all"
                aria-label="Back"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <h1 className="text-base font-semibold tracking-tight text-slate-900">
                Settings
              </h1>
            </div>
            <div className="mx-4 mb-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Settings Sections */}
            <div className="px-6 pb-6 space-y-3">
              <ProfilePlanSection />
              <SubscriptionPlanSection />
              <NotificationsSection />
              <NutritionSection />
              <AppearanceSection />
              <AICoachSection />
              <TesterFeedbackSection />
              <DataPrivacySection />
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-slate-200/50">
              <p className="text-xs text-center text-slate-500">
                Version 1.0 · <span className="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline transition-colors">Contact support</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </main>
  )
}
