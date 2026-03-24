import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { apiError } from '@/lib/api/response'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const RATE_LIMIT_STORE_KEY = '__shiftcoach_rate_limit_store__'

function getRateLimitStore(): Map<string, RateLimitEntry> {
  const globalAny = globalThis as unknown as Record<string, unknown>
  if (!globalAny[RATE_LIMIT_STORE_KEY]) {
    globalAny[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitEntry>()
  }
  return globalAny[RATE_LIMIT_STORE_KEY] as Map<string, RateLimitEntry>
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export function checkRateLimit(opts: {
  key: string
  limit: number
  windowMs: number
}): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const { key, limit, windowMs } = opts
  const now = Date.now()
  const store = getRateLimitStore()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  store.set(key, current)
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}

export function rateLimitByIp(req: NextRequest, scope: string, limit: number, windowMs: number): NextResponse | null {
  const ip = getClientIp(req)
  const result = checkRateLimit({
    key: `${scope}:${ip}`,
    limit,
    windowMs,
  })

  if (result.allowed) return null

  return apiError(
    429,
    'rate_limited',
    'Too many requests. Please try again later.',
    {
      retryAfterSeconds: result.retryAfterSeconds,
    },
  )
}

export function requireSameOriginForSessionWrites(req: NextRequest): NextResponse | null {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return null

  // Token-authenticated calls (native/bearer) do not rely on cookie CSRF protections.
  const authHeader = req.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) return null

  const origin = req.headers.get('origin')
  const allowedOrigin = req.nextUrl.origin
  const secFetchSite = req.headers.get('sec-fetch-site')

  if (origin && origin === allowedOrigin) return null
  if (!origin && (secFetchSite === 'same-origin' || secFetchSite === 'same-site')) return null

  return apiError(403, 'csrf_blocked', 'Request origin verification failed')
}

export function verifyHmacSha256Signature(rawBody: string, secret: string, providedSignature: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const provided = providedSignature.trim()
  if (expected.length !== provided.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
}

