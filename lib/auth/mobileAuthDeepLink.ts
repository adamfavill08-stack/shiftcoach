/**
 * Fixed native return URL prefix (must match Android intent `shiftcoach` / `auth` / `/callback`
 * and iOS URL scheme). Runtime detection lives in `getAuthAppOrigin()` in `oauthRedirect.ts`.
 */
const NATIVE_AUTH_CALLBACK_PREFIX = 'shiftcoach://auth/callback'

export function getMobileAuthCallbackUrlPrefix(): string {
  return NATIVE_AUTH_CALLBACK_PREFIX
}

export function isMobileAuthCallbackUrl(url: string): boolean {
  return Boolean(url && url.startsWith(NATIVE_AUTH_CALLBACK_PREFIX))
}
