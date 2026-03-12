'use client'

import Link from 'next/link'
import { Search, MoonStar, Activity, MessageCircle, Settings2, Watch, Send } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'

export default function BrowsePage() {
  const { t } = useTranslation()

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="mb-1">
          <h1 className="text-xl font-semibold text-slate-900">
            {t('browse.title')}
          </h1>
          <p className="text-sm text-slate-600">
            {t('browse.subtitle')}
          </p>
        </header>

        {/* Search bar */}
        <div className="relative">
          <div className="flex items-center gap-2 rounded-2xl bg-white/90 border border-slate-200/70 px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search help, topics, logs…"
              className="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Quick access tiles */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <BrowseTile
            href="/sleep/logs"
            icon={MoonStar}
            label={t('browse.sleepLog.title')}
            description={t('browse.sleepLog.desc')}
          />
          <BrowseTile
            href="/activity/log"
            icon={Activity}
            label={t('browse.activity.title')}
            description={t('browse.activity.desc')}
          />
          <BrowseTile
            href="/coach"
            icon={MessageCircle}
            label={t('browse.shiftCoach.title')}
            description={t('browse.shiftCoach.desc')}
          />
          <BrowseTile
            href="/settings"
            icon={Settings2}
            label={t('browse.settings.title')}
            description={t('browse.settings.desc')}
          />
          <BrowseTile
            href="/wearables-setup"
            icon={Watch}
            label={t('browse.wearables.title')}
            description={t('browse.wearables.desc')}
          />
          <BrowseTile
            href="/app/settings#feedback"
            icon={Send}
            label={t('browse.feedback.title')}
            description={t('browse.feedback.desc')}
          />
        </div>
      </div>
    </main>
  )
}

type TileProps = {
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  description: string
}

function BrowseTile({ href, icon: Icon, label, description }: TileProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-2xl bg-white/90 border border-slate-200/70 px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
        <span className="text-sm font-semibold text-slate-900">
          {label}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-slate-500">
        {description}
      </p>
    </Link>
  )
}

