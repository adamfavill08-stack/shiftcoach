import { NextRequest } from 'next/server'

export function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return token.length > 0 ? token : null
}

