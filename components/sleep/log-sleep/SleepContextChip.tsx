'use client'

import { MoonStar } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import type { LogSleepContextChip as ChipModel } from '@/lib/sleep/logSleepContextChip'

export function SleepContextChip({ chip }: { chip: ChipModel | null }) {
  const { t } = useTranslation()
  if (!chip) return null
  return (
    <div className="flex justify-center px-1">
      <p className="sleep-context-pill min-h-[2.375rem] justify-center px-5 py-2 text-center text-[11px] font-semibold tracking-wide sm:min-h-[2.5rem] sm:gap-2.5 sm:px-7 sm:text-xs">
        <MoonStar className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
        <span className="min-w-0 truncate">{t(chip.i18nKey, chip.params)}</span>
      </p>
    </div>
  )
}
