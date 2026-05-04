'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { useSettings } from '@/lib/hooks/useSettings'

function firstToken(name: string) {
  const t = name.trim().split(/\s+/)[0]
  return t || name.trim()
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

export function ProfilePlanSection() {
  const { t } = useTranslation()
  const router = useRouter()
  const { settings, loading } = useSettings()
  const savedName = settings?.name?.trim() ?? ''
  const title = savedName ? firstToken(savedName) : t('settings.profile.title')
  const letter = savedName ? initials(savedName) : null

  return (
    <button
      onClick={() => router.push('/settings/profile')}
      className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-400 grid place-items-center flex-shrink-0 shadow-sm text-white text-xs font-semibold">
          {loading ? (
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : letter ? (
            letter
          ) : (
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        <div className="min-w-0 text-left">
          <h3 className="text-sm font-medium text-slate-900 truncate">{title}</h3>
          {savedName ? (
            <p className="text-xs text-slate-500 truncate">{t('settings.profile.subtitle')}</p>
          ) : null}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition flex-shrink-0" strokeWidth={2} />
    </button>
  )
}

