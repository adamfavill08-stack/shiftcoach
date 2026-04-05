'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'

export default function ShiftWorkerGoalsPage() {
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
            {t('shiftWorker.goals.title')}
          </h1>
        </header>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.goals.intro')}
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
            {t('shiftWorker.goals.sleepTitle')}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
            {t('shiftWorker.goals.sleepHint')}
          </p>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: 'var(--text-main)' }}
          >
            <li>{t('shiftWorker.goals.sleepLi1')}</li>
            <li>{t('shiftWorker.goals.sleepLi2')}</li>
            <li>{t('shiftWorker.goals.sleepLi3')}</li>
          </ul>
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
            {t('shiftWorker.goals.activityTitle')}
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: 'var(--text-main)' }}
          >
            <li>{t('shiftWorker.goals.activityLi1')}</li>
            <li>{t('shiftWorker.goals.activityLi2')}</li>
            <li>{t('shiftWorker.goals.activityLi3')}</li>
          </ul>
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
            {t('shiftWorker.goals.eatingTitle')}
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: 'var(--text-main)' }}
          >
            <li>{t('shiftWorker.goals.eatingLi1')}</li>
            <li>{t('shiftWorker.goals.eatingLi2')}</li>
            <li>{t('shiftWorker.goals.eatingLi3')}</li>
          </ul>
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
            {t('shiftWorker.goals.timeTitle')}
          </h2>
          <ul
            className="text-sm list-disc list-inside space-y-2"
            style={{ color: 'var(--text-main)' }}
          >
            <li>{t('shiftWorker.goals.timeLi1')}</li>
            <li>{t('shiftWorker.goals.timeLi2')}</li>
            <li>{t('shiftWorker.goals.timeLi3')}</li>
          </ul>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {t('shiftWorker.goals.timeFooter')}
          </p>
        </section>
      </div>
    </main>
  )
}
