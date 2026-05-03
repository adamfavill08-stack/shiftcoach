import type { NextRequest } from 'next/server'
import {
  SHIFT_CALI_COACH_SYSTEM_PROMPT,
  SHIFT_CALI_COACH_SYSTEM_PROMPT_DE,
  SHIFT_CALI_COACH_SYSTEM_PROMPT_ES,
  SHIFT_CALI_COACH_SYSTEM_PROMPT_FR,
} from '@/lib/coach/systemPrompt'

export type CoachBundleLocale = 'en' | 'de' | 'es' | 'fr'

/** Uses optional `X-ShiftCoach-Locale` from the client (see `authedFetch`). */
export function coachLocaleFromRequest(req: NextRequest): CoachBundleLocale {
  const raw = req.headers.get('x-shiftcoach-locale')?.trim().toLowerCase() ?? ''
  if (raw === 'de' || raw.startsWith('de-')) return 'de'
  if (raw === 'es' || raw.startsWith('es-')) return 'es'
  if (raw === 'fr' || raw.startsWith('fr-')) return 'fr'
  return 'en'
}

export function coachSystemPromptFromRequest(req: NextRequest): string {
  const loc = coachLocaleFromRequest(req)
  if (loc === 'de') return SHIFT_CALI_COACH_SYSTEM_PROMPT_DE
  if (loc === 'es') return SHIFT_CALI_COACH_SYSTEM_PROMPT_ES
  if (loc === 'fr') return SHIFT_CALI_COACH_SYSTEM_PROMPT_FR
  return SHIFT_CALI_COACH_SYSTEM_PROMPT
}

/** Instruction appended so the model answers in the user’s bundle language. */
export function coachLocalizedOutputHint(req: NextRequest): string {
  const loc = coachLocaleFromRequest(req)
  if (loc === 'es') {
    return '\n\nIMPORTANTE: Redacta TODO el análisis siguiente en español (títulos, viñetas y texto), manteniendo la misma estructura de secciones (Resumen, Ideas clave, Recomendaciones, Posibles problemas).'
  }
  if (loc === 'fr') {
    return '\n\nIMPORTANT : rédigez TOUTE l’analyse suivante en français (titres, puces et texte), en conservant la même structure de sections (Aperçu, Points clés, Recommandations, Points d’attention).'
  }
  if (loc === 'de') {
    return '\n\nWICHTIG: Verfasse die GESAMTE folgende Analyse auf Deutsch (Überschriften, Aufzählungen und Fließtext) und behalte dieselbe Abschnittsstruktur bei (Überblick, Kernpunkte, Empfehlungen, Hinweise).'
  }
  return ''
}

export function coachLocalizedSuggestionsHint(req: NextRequest): string {
  const loc = coachLocaleFromRequest(req)
  if (loc === 'es') {
    return '\n\nIMPORTANTE: Redacta todas las sugerencias siguientes en español (párrafo y viñetas).'
  }
  if (loc === 'fr') {
    return '\n\nIMPORTANT : rédigez toutes les suggestions suivantes en français (paragraphe et puces).'
  }
  if (loc === 'de') {
    return '\n\nWICHTIG: Formuliere alle folgenden Vorschläge auf Deutsch (Absatz und Aufzählungen).'
  }
  return ''
}
