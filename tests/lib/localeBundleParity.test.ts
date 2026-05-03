import { describe, it, expect } from 'vitest'
import enMessages from '@/lib/i18n/locale-bundles/en'
import esMessages from '@/lib/i18n/locale-bundles/es'
import frMessages from '@/lib/i18n/locale-bundles/fr'
import deMessages from '@/lib/i18n/locale-bundles/de'

const BUNDLE_LOCALES = ['es', 'de', 'fr', 'pt-BR', 'pl'] as const

/** Product names / tokens that legitimately match across locales. */
const SAME_VALUE_OK = new Set<string>([
  'upgrade.bannerKicker',
  'upgrade.buttons.monthlyWithPrice',
  'upgrade.buttons.annualWithPrice',
  'browse.shiftCoach.title',
  'nav.blog',
])

describe('locale bundle key parity vs English', () => {
  it('Spanish bundle defines every key present in the English bundle', () => {
    const enKeys = new Set(Object.keys(enMessages))
    const esKeys = new Set(Object.keys(esMessages))
    const missing = [...enKeys].filter((k) => !esKeys.has(k))
    expect(
      missing,
      `Missing ${missing.length} keys in es (showing up to 40):\n${missing.slice(0, 40).join('\n')}`,
    ).toEqual([])
  })

  it('Spanish bundle does not copy English for account/legal/shift-worker chrome', () => {
    const prefixes = ['account.', 'legal.', 'shiftWorker.', 'verifyOnboarding.']
    const stillEnglish = Object.keys(esMessages).filter((key) => {
      if (!prefixes.some((p) => key.startsWith(p))) return false
      if (SAME_VALUE_OK.has(key)) return false
      return esMessages[key as keyof typeof esMessages] === enMessages[key as keyof typeof enMessages]
    })
    expect(
      stillEnglish,
      `Spanish equals English for ${stillEnglish.length} keys (first 25):\n${stillEnglish.slice(0, 25).join('\n')}`,
    ).toEqual([])
  })

  it('French bundle defines every key present in the English bundle', () => {
    const enKeys = new Set(Object.keys(enMessages))
    const frKeys = new Set(Object.keys(frMessages))
    const missing = [...enKeys].filter((k) => !frKeys.has(k))
    expect(
      missing,
      `Missing ${missing.length} keys in fr (showing up to 50):\n${missing.slice(0, 50).join('\n')}`,
    ).toEqual([])
  })

  it('German bundle defines every key present in the English bundle', () => {
    const enKeys = new Set(Object.keys(enMessages))
    const deKeys = new Set(Object.keys(deMessages))
    const missing = [...enKeys].filter((k) => !deKeys.has(k))
    expect(
      missing,
      `Missing ${missing.length} keys in de (showing up to 50):\n${missing.slice(0, 50).join('\n')}`,
    ).toEqual([])
  })

  it('German bundle does not copy English for account/legal/shift-worker chrome', () => {
    const prefixes = ['account.', 'legal.', 'shiftWorker.', 'verifyOnboarding.']
    const stillEnglish = Object.keys(deMessages).filter((key) => {
      if (!prefixes.some((p) => key.startsWith(p))) return false
      if (SAME_VALUE_OK.has(key)) return false
      return deMessages[key as keyof typeof deMessages] === enMessages[key as keyof typeof enMessages]
    })
    expect(
      stillEnglish,
      `German equals English for ${stillEnglish.length} keys (first 25):\n${stillEnglish.slice(0, 25).join('\n')}`,
    ).toEqual([])
  })

  it('French bundle does not copy English for account/legal/shift-worker chrome', () => {
    const prefixes = ['account.', 'legal.', 'shiftWorker.', 'verifyOnboarding.']
    const stillEnglish = Object.keys(frMessages).filter((key) => {
      if (!prefixes.some((p) => key.startsWith(p))) return false
      if (SAME_VALUE_OK.has(key)) return false
      return frMessages[key as keyof typeof frMessages] === enMessages[key as keyof typeof enMessages]
    })
    expect(
      stillEnglish,
      `French equals English for ${stillEnglish.length} keys (first 25):\n${stillEnglish.slice(0, 25).join('\n')}`,
    ).toEqual([])
  })

  it('documents bundle locales list (keep in sync with language-provider)', () => {
    expect(BUNDLE_LOCALES).toContain('es')
  })
})
