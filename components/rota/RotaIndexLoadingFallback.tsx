'use client'

import { useTranslation } from '@/components/providers/language-provider'

export function RotaIndexLoadingFallback() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-slate-500">{t('rota.shell.loading')}</div>
    </div>
  )
}
