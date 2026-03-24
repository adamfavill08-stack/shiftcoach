import { NextResponse } from 'next/server'

type ErrorBody = {
  ok: false
  error: string
  code: string
  details?: unknown
}

export function apiError(status: number, code: string, error: string, details?: unknown) {
  const body: ErrorBody = details === undefined ? { ok: false, error, code } : { ok: false, error, code, details }
  return NextResponse.json(body, { status })
}

export function apiUnauthorized(error = 'Unauthorized') {
  return apiError(401, 'unauthorized', error)
}

export function apiBadRequest(code: string, error: string, details?: unknown) {
  return apiError(400, code, error, details)
}

export function apiServerError(code = 'internal_error', error = 'Internal server error') {
  return apiError(500, code, error)
}

