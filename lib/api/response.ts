import { NextResponse } from 'next/server'

type ApiMeta = {
  requestId?: string
  timestamp: string
}

type ApiSuccessBody<T> = {
  success: true
  data: T
  meta: ApiMeta
}

type ApiErrorBody = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  meta: ApiMeta
  // Backward-compatible fields used by existing callers.
  ok: false
  code: string
  detail?: unknown
}

function buildMeta(requestId?: string): ApiMeta {
  return {
    requestId,
    timestamp: new Date().toISOString(),
  }
}

export function apiSuccess<T>(data: T, status = 200, requestId?: string) {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
    meta: buildMeta(requestId),
  }
  return NextResponse.json(body, { status })
}

export function apiError(status: number, code: string, message: string, details?: unknown, requestId?: string) {
  const body: ApiErrorBody = {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
    meta: buildMeta(requestId),
    ok: false,
    code,
    detail: details,
  }
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

