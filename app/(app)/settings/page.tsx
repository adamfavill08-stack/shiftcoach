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
        <div className="relative overflow-hidden rounded-3xl bg-white/75 backdrop-blur-xl border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_-16px_rgba(0,0,0,0.12)] p-4">
          {/* Optional inner highlight */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/60 via-transparent to-transparent" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="pt-2 pb-3 px-2 flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center justify-center rounded-full bg-transparent w-8 h-8 text-slate-400 hover:bg-slate-100/60 hover:text-slate-600 transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                Settings
              </h3>
              <div className="w-8" /> {/* Spacer for centering */}
            </div>

            {/* Settings Sections */}
            <div className="px-2 pb-4 space-y-1">
              {/* Account Section */}
              <div className="pt-4">
                <p className="px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Account
                </p>
                <div className="space-y-1">
                  <ProfilePlanSection />
                  <SubscriptionPlanSection />
                </div>
              </div>

              {/* Preferences Section */}
              <div className="pt-2">
                <p className="px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Preferences
                </p>
                <div className="space-y-1">
                  <NotificationsSection />
                  <NutritionSection />
                  <AppearanceSection />
                </div>
              </div>

              {/* Coaching Section */}
              <div className="pt-2">
                <p className="px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Coaching
                </p>
                <div className="space-y-1">
                  <AICoachSection />
                </div>
              </div>

              {/* Support Section */}
              <div className="pt-2">
                <p className="px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Support
                </p>
                <div className="space-y-1">
                  <TesterFeedbackSection />
                  <DataPrivacySection />
                </div>
              </div>
            </div>


            {/* Footer */}
            <div className="px-2 pb-4 pt-4 border-t border-slate-200/50 mt-2">
              <p className="text-xs text-center text-slate-500">
                Version 1.0 · <span className="text-slate-400 cursor-pointer hover:text-slate-600 hover:underline transition-colors">Contact support</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </main>
  )
}
