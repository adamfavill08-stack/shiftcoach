import { NextRequest, NextResponse } from 'next/server'
import { ZodType } from 'zod'
import { apiBadRequest } from '@/lib/api/response'

type ValidationDetail = {
  field: string
  issue: string
  message: string
}

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
    const details: ValidationDetail[] = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.') || '$',
      issue: issue.code,
      message: issue.message,
    }))
    return {
      ok: false,
      response: apiBadRequest('validation_error', 'Request payload failed validation', details),
    }
  }

  return { ok: true, data: parsed.data }
}

