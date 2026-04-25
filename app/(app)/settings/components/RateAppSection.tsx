'use client'

import { useState } from 'react'
import { Star, ChevronRight, X } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { useTranslation } from '@/components/providers/language-provider'
import { markInAppReviewPrompted } from '@/lib/inAppReview/inAppReviewSchedule'
import { isAndroidNative, ShiftCoachAppReview } from '@/lib/native/shiftCoachAppReview'
import {
  dismissRatePrompt,
  getPlayStoreUrl,
  markRateActionCompleted,
  shouldHighlightRateAction,
} from '@/lib/rating/rateAppPrompt'

export function RateAppSection() {
  const { t } = useTranslation()
  const [ratingBusy, setRatingBusy] = useState(false)
  const highlighted = shouldHighlightRateAction()
  const title =
    t('settings.rateApp.title') === 'settings.rateApp.title'
      ? 'Rate the app'
      : t('settings.rateApp.title')
  const subtitle =
    t('settings.rateApp.subtitle') === 'settings.rateApp.subtitle'
      ? 'Help others discover ShiftCoach on Google Play.'
      : t('settings.rateApp.subtitle')
  const promptSubtitle =
    t('settings.rateApp.subtitlePrompt') === 'settings.rateApp.subtitlePrompt'
      ? 'Enjoying ShiftCoach? A quick rating helps a lot.'
      : t('settings.rateApp.subtitlePrompt')

  const handleRate = async () => {
    if (typeof window === 'undefined' || ratingBusy) return
    setRatingBusy(true)
    try {
      if (isAndroidNative()) {
        try {
          const result = await ShiftCoachAppReview.requestReview()
          if (result.requested) {
            // Play does not report whether the sheet was shown or a review was submitted.
            markInAppReviewPrompted(window.localStorage, Date.now())
            markRateActionCompleted()
            return
          }
        } catch {
          // Fall back to opening the listing (e.g. Play Core unavailable).
        }
      }

      window.open(getPlayStoreUrl(), '_blank', 'noopener,noreferrer')
      markRateActionCompleted()
      const storeToast =
        t('settings.rateApp.toast.thanks') === 'settings.rateApp.toast.thanks'
          ? 'Thanks for supporting ShiftCoach!'
          : t('settings.rateApp.toast.thanks')
      showToast(storeToast, 'success')
    } catch {
      showToast(t('settings.rateApp.toast.failed'), 'error')
    } finally {
      setRatingBusy(false)
    }
  }

  const handleDismiss = () => {
    dismissRatePrompt()
    showToast(t('settings.rateApp.toast.dismissed'), 'info')
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={ratingBusy}
        onClick={() => void handleRate()}
        className={`group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full disabled:opacity-60 disabled:pointer-events-none ${
          highlighted ? 'border-sky-300/80' : 'border-slate-100'
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center flex-shrink-0 shadow-sm">
            <Star className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-sm font-medium text-slate-900">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {highlighted ? promptSubtitle : subtitle}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition flex-shrink-0" strokeWidth={2} />
      </button>

      {highlighted ? (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          aria-label={t('settings.rateApp.dismissAria')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
