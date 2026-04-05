'use client'

import { MobileShell } from '@/components/MobileShell'
import { useTranslation } from '@/components/providers/language-provider'

export default function CoachPage() {
  const { t } = useTranslation()
  return (
    <MobileShell title={t('coach.shellTitle')}>{t('coach.placeholder')}</MobileShell>
  )
}

