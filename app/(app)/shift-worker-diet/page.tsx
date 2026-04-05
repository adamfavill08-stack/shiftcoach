'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'

export default function ShiftWorkerDietPage() {
  const { t } = useTranslation()
  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            aria-label={t('shiftWorker.health.backAria')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: 'var(--text-main)' }}
          >
            {t('shiftWorker.diet.title')}
          </h1>
        </header>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.diet.whyTitle')}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.diet.whyP1')}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.diet.whyP2')}
          </p>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.diet.issuesTitle')}
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: 'var(--text-main)' }}
          >
            <li>{t('shiftWorker.diet.issuesLi1')}</li>
            <li>{t('shiftWorker.diet.issuesLi2')}</li>
            <li>{t('shiftWorker.diet.issuesLi3')}</li>
            <li>{t('shiftWorker.diet.issuesLi4')}</li>
          </ul>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.diet.issuesFooter')}
          </p>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.diet.structureTitle')}
          </h2>
          <div className="space-y-2 text-sm" style={{ color: 'var(--text-main)' }}>
            <p className="font-semibold">{t('shiftWorker.diet.dayLabel')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('shiftWorker.diet.dayLi1')}</li>
              <li>{t('shiftWorker.diet.dayLi2')}</li>
              <li>{t('shiftWorker.diet.dayLi3')}</li>
            </ul>
            <p className="mt-3 font-semibold">{t('shiftWorker.diet.nightLabel')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('shiftWorker.diet.nightLi1')}</li>
              <li>{t('shiftWorker.diet.nightLi2')}</li>
              <li>{t('shiftWorker.diet.nightLi3')}</li>
            </ul>
          </div>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.diet.profileTitle')}
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: 'var(--text-main)' }}
          >
            <li>{t('shiftWorker.diet.profileLi1')}</li>
            <li>{t('shiftWorker.diet.profileLi2')}</li>
            <li>{t('shiftWorker.diet.profileLi3')}</li>
          </ul>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.diet.profileFooter')}
          </p>
        </section>
      </div>
    </main>
  )
}
