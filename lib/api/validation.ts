import { NextRequest, NextResponse } from 'next/server'
import { ZodType } from 'zod'
import { apiBadRequest } from '@/lib/api/response'

export async function parseJsonBody<T>(
  req: NextRequest,
  schema: ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const raw = await req.json().catch(() => null)
  if (raw === null) {
    return {
      ok: false,
      response: apiBadRequest('invalid_json', 'Request body must be valid JSON'),
    }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      response: apiBadRequest('invalid_payload', 'Request payload failed validation', parsed.error.flatten()),
    }
  }

  return { ok: true, data: parsed.data }
}

