import type { EmailOtpType } from '@supabase/supabase-js'

const OTP_TYPES = new Set<string>([
  'signup',
  'email',
  'invite',
  'recovery',
  'magiclink',
  'email_change',
])

export function parseOtpType(type: string | null): EmailOtpType | null {
  if (!type || !OTP_TYPES.has(type)) return null
  return type as EmailOtpType
}
