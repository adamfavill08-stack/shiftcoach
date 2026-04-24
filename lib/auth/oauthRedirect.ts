/** Path after `/auth/callback` exchanges the code; client then routes by profile. */
export const AUTH_OAUTH_CONTINUE_PATH = '/auth/oauth-continue'

export function buildOAuthRedirectTo(): string {
  if (typeof window === 'undefined') return ''
  const next = encodeURIComponent(AUTH_OAUTH_CONTINUE_PATH)
  return `${window.location.origin}/auth/callback?next=${next}`
}
