'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { updateProfile } from '@/lib/profile'
import { showToast } from '@/components/ui/Toast'

export function GuidedHintsSettingsRow() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const onReset = async () => {
    setBusy(true)
    try {
      const ok = await updateProfile({
        onboarding_hints_completed: false,
        onboarding_hints_enabled: true,
        onboarding_step: 1,
      } as Parameters<typeof updateProfile>[0])
      if (!ok) {
        showToast(t('guidedHints.settings.toastFailed'), 'error')
        return
      }
      showToast(t('guidedHints.settings.toastOn'), 'success')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('guided-hints-reset'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onReset()}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-colors hover:border-[#05afc5]/40 hover:bg-[#05afc5]/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#05afc5] to-sky-600 shadow-sm">
          <Sparkles className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900">{t('guidedHints.settings.showAgain')}</h3>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">{t('guidedHints.settings.showAgainHint')}</p>
        </div>
      </div>
    </button>
  )
}
