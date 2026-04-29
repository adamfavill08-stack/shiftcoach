export function buildOAuthRedirectTo(): string {
  if (typeof window === 'undefined') return ''
  // Important: Google (and other providers) require the redirect URI to match an
  // authorized redirect exactly. Many configs only allow `/auth/callback` without query params.
  // We pass any "next" routing hint via a cookie (set by the client) instead.
  return `${window.location.origin}/auth/callback`
}
