'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type SupportedLanguage = 'en' | 'es' | 'de'
type LanguagePreference = 'device' | SupportedLanguage

type LanguageContextValue = {
  preference: LanguagePreference
  language: SupportedLanguage
  setPreference: (pref: LanguagePreference) => void
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function resolveDeviceLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('es')) return 'es'
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('en')) return 'en'
  return 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('device')
  const [language, setLanguage] = useState<SupportedLanguage>('en')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('shiftcoach:language')
    const pref: LanguagePreference =
      stored === 'device' || stored === 'en' || stored === 'es' || stored === 'de'
        ? (stored as LanguagePreference)
        : 'device'
    setPreferenceState(pref)
    setLanguage(pref === 'device' ? resolveDeviceLanguage() : pref)
  }, [])

  const setPreference = (pref: LanguagePreference) => {
    setPreferenceState(pref)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('shiftcoach:language', pref)
    }
    setLanguage(pref === 'device' ? resolveDeviceLanguage() : pref)
  }

  const value = useMemo(
    () => ({
      preference,
      language,
      setPreference,
    }),
    [preference, language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}

// Simple in-memory translation table for core UI strings.
const messages: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.calendar': 'Calendar',
    'nav.blog': 'Blog',
    'nav.browse': 'Browse',
    'nav.profile': 'Profile',

    'browse.title': 'Browse',
    'browse.subtitle': 'Jump straight to the tools you need.',
    'browse.sleepLog.title': 'Sleep Log',
    'browse.sleepLog.desc': 'View and edit your recent sleep.',
    'browse.activity.title': 'Activity',
    'browse.activity.desc': 'Log steps and activity for your shifts.',
    'browse.shiftCoach.title': 'Shift Coach',
    'browse.shiftCoach.desc': 'Ask the AI coach for tailored tips.',
    'browse.settings.title': 'Settings',
    'browse.settings.desc': 'Update profile, units and app preferences.',
    'browse.wearables.title': 'Wearables',
    'browse.wearables.desc': 'Connect your Apple or Samsung watch.',
    'browse.feedback.title': 'Report a problem',
    'browse.feedback.desc': 'Send feedback or report a bug.',

    'settings.title': 'Settings',
    'settings.section.account': 'Account',
    'settings.section.preferences': 'Preferences',
    'settings.section.coaching': 'Coaching',
    'settings.section.support': 'Support',

    'settings.language.title': 'Language',
    'settings.language.device': 'Use device language',
    'settings.language.en': 'English',
    'settings.language.es': 'Spanish',
    'settings.language.de': 'German',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.calendar': 'Calendario',
    'nav.blog': 'Blog',
    'nav.browse': 'Explorar',
    'nav.profile': 'Perfil',

    'browse.title': 'Explorar',
    'browse.subtitle': 'Ve directo a las herramientas que necesitas.',
    'browse.sleepLog.title': 'Registro de sueño',
    'browse.sleepLog.desc': 'Revisa y edita tu sueño reciente.',
    'browse.activity.title': 'Actividad',
    'browse.activity.desc': 'Registra pasos y actividad para tus turnos.',
    'browse.shiftCoach.title': 'Shift Coach',
    'browse.shiftCoach.desc': 'Pregunta al coach de IA por consejos a medida.',
    'browse.settings.title': 'Ajustes',
    'browse.settings.desc': 'Actualiza perfil, unidades y preferencias.',
    'browse.wearables.title': 'Wearables',
    'browse.wearables.desc': 'Conecta tu reloj Apple o Samsung.',
    'browse.feedback.title': 'Informar un problema',
    'browse.feedback.desc': 'Envía comentarios o informa un error.',

    'settings.title': 'Ajustes',
    'settings.section.account': 'Cuenta',
    'settings.section.preferences': 'Preferencias',
    'settings.section.coaching': 'Entrenamiento',
    'settings.section.support': 'Soporte',

    'settings.language.title': 'Idioma',
    'settings.language.device': 'Usar idioma del dispositivo',
    'settings.language.en': 'Inglés',
    'settings.language.es': 'Español',
    'settings.language.de': 'Alemán',
  },
  de: {
    'nav.home': 'Start',
    'nav.calendar': 'Dienstplan',
    'nav.blog': 'Blog',
    'nav.browse': 'Entdecken',
    'nav.profile': 'Profil',

    'browse.title': 'Entdecken',
    'browse.subtitle': 'Schnell zu den wichtigsten Werkzeugen.',
    'browse.sleepLog.title': 'Schlafprotokoll',
    'browse.sleepLog.desc': 'Sieh und bearbeite deinen letzten Schlaf.',
    'browse.activity.title': 'Aktivität',
    'browse.activity.desc': 'Erfasse Schritte und Aktivität für deine Schichten.',
    'browse.shiftCoach.title': 'Shift Coach',
    'browse.shiftCoach.desc': 'Frag den KI‑Coach nach persönlichen Tipps.',
    'browse.settings.title': 'Einstellungen',
    'browse.settings.desc': 'Profil, Einheiten und App‑Einstellungen anpassen.',
    'browse.wearables.title': 'Wearables',
    'browse.wearables.desc': 'Verbinde deine Apple‑ oder Samsung‑Uhr.',
    'browse.feedback.title': 'Problem melden',
    'browse.feedback.desc': 'Feedback senden oder Fehler melden.',

    'settings.title': 'Einstellungen',
    'settings.section.account': 'Konto',
    'settings.section.preferences': 'Präferenzen',
    'settings.section.coaching': 'Coaching',
    'settings.section.support': 'Support',

    'settings.language.title': 'Sprache',
    'settings.language.device': 'Sprache des Geräts verwenden',
    'settings.language.en': 'Englisch',
    'settings.language.es': 'Spanisch',
    'settings.language.de': 'Deutsch',
  },
}

export function useTranslation() {
  const { language } = useLanguage()
  return {
    t: (key: string) => messages[language]?.[key] ?? messages.en[key] ?? key,
  }
}

