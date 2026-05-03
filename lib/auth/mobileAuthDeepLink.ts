/**
 * Deep link auth return path (no `/auth` web segment). Base env example: `shiftcoach://auth`.
 */
export function getMobileOAuthRedirectBaseFromEnv(): string {
  const raw =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MOBILE_OAUTH_REDIRECT_BASE
      ? String(process.env.NEXT_PUBLIC_MOBILE_OAUTH_REDIRECT_BASE).trim()
      : ''
  return raw.replace(/\/$/, '')
}

export function getMobileAuthCallbackUrlPrefix(): string {
  const base = getMobileOAuthRedirectBaseFromEnv()
  if (!base) return ''
  return `${base}/callback`
}

export function isMobileAuthCallbackUrl(url: string): boolean {
  const prefix = getMobileAuthCallbackUrlPrefix()
  if (!prefix || !url) return false
  return url.startsWith(prefix)
}
