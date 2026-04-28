'use client'

import Link from 'next/link'
import { useTranslation } from '@/components/providers/language-provider'

type UpgradeCardProps = {
  title: string
  description: string
  ctaLabel?: string
  href?: string
}

export function UpgradeCard({
  title,
  description,
  href = '/upgrade',
  ctaLabel,
}: UpgradeCardProps) {
  const { t } = useTranslation()
  const resolvedCtaLabel = ctaLabel ?? t('subscription.upgradeCard.cta')

  return (
    <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 px-4 py-4 dark:border-amber-800/50 dark:bg-amber-950/20">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/90">
        {description}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-300/80">
        {t('subscription.upgradeCard.supporting')}
      </p>
      <Link
        href={href}
        className="mt-3 inline-flex items-center rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400"
      >
        {resolvedCtaLabel}
      </Link>
    </div>
  )
}
