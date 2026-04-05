'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'

export default function RecoveryPage() {
  const { t } = useTranslation()
  // Placeholder score; wire to real value if available
  const recoveryScore: number | null = null
  const value = typeof recoveryScore === 'number' ? recoveryScore : 74
  const band = value >= 75 ? 'high' : value >= 50 ? 'medium' : 'low'

  const bandLabel =
    band === 'high'
      ? t('detail.recovery.bandHigh')
      : band === 'medium'
        ? t('detail.recovery.bandMedium')
        : t('detail.recovery.bandLow')

  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        <header className="flex items-center gap-2 mb-1">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }}
            aria-label={t('detail.common.backToDashboard')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>
              {t('detail.recovery.title')}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
              {t('detail.recovery.subtitle')}
            </p>
          </div>
        </header>

        <section
          className="rounded-2xl backdrop-blur-xl border px-4 py-3 flex flex-col gap-1 text-xs"
          style={{
            backgroundColor: 'var(--card-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-soft)',
          }}
        >
          <span>• {t('detail.recovery.fact1')}</span>
          <span>• {t('detail.recovery.fact2')}</span>
          <span>• {t('detail.recovery.fact3')}</span>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-6 py-6 flex flex-col items-center gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <p className="text-5xl font-semibold" style={{ color: 'var(--text-main)' }}>
            {value}
          </p>
          <span
            className={
              `mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ` +
              (band === 'high'
                ? 'bg-emerald-50 text-emerald-600'
                : band === 'medium'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-rose-50 text-rose-600')
            }
          >
            {bandLabel}
          </span>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🧠</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              {t('detail.recovery.whatTitle')}
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {t('detail.recovery.whatBody')}
          </p>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌙☀️</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              {t('detail.recovery.whyTitle')}
            </p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>{t('detail.recovery.whyLi1')}</li>
            <li>{t('detail.recovery.whyLi2')}</li>
            <li>{t('detail.recovery.whyLi3')}</li>
          </ul>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📊</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              {t('detail.recovery.howTitle')}
            </p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>{t('detail.recovery.howLi1')}</li>
            <li>{t('detail.recovery.howLi2')}</li>
            <li>{t('detail.recovery.howLi3')}</li>
            <li>{t('detail.recovery.howLi4')}</li>
          </ul>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('detail.recovery.howDisclaimer')}
          </p>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💡</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              {t('detail.recovery.improveTitle')}
            </p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>{t('detail.recovery.improveLi1')}</li>
            <li>{t('detail.recovery.improveLi2')}</li>
            <li>{t('detail.recovery.improveLi3')}</li>
          </ul>
        </section>

        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-4 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            {t('detail.recovery.ctaTitle')}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
            {t('detail.recovery.ctaBody')}
          </p>
          <Link
            href="/dashboard"
            className="mt-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200"
          >
            {t('detail.common.goToDashboard')}
          </Link>
        </section>
      </div>
    </main>
  )
}
