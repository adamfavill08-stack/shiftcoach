/**
 * Subscribe to OS light/dark changes. Uses addEventListener when available and
 * falls back to deprecated addListener for older Safari / Android WebView.
 */
export function subscribePrefersColorSchemeDarkChange(
  onChange: (prefersDark: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const mql = window.matchMedia('(prefers-color-scheme: dark)')

  const modern = (event: MediaQueryListEvent) => {
    onChange(event.matches)
  }

  const legacy = () => {
    onChange(mql.matches)
  }

  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', modern)
    return () => mql.removeEventListener('change', modern)
  }

  mql.addListener(legacy)
  return () => mql.removeListener(legacy)
}
