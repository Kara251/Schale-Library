import { NextResponse } from 'next/server'

const DEFAULT_TRUSTED_ORIGINS = (process.env.NEXT_PUBLIC_SITE_URL || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getRuntimeOrigin(request: Request) {
  const requestUrlOrigin = normalizeOrigin(request.url)
  if (requestUrlOrigin) {
    return requestUrlOrigin
  }

  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http'
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')

  if (!forwardedHost) {
    return null
  }

  return `${forwardedProto}://${forwardedHost}`
}

function getTrustedOrigins(request: Request) {
  const runtimeOrigin = getRuntimeOrigin(request)
  const configuredOrigins = (process.env.ADMIN_PANEL_TRUSTED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return new Set(
    [runtimeOrigin, ...DEFAULT_TRUSTED_ORIGINS, ...configuredOrigins]
      .map((value) => (value ? normalizeOrigin(value) : null))
      .filter((value): value is string => Boolean(value))
  )
}

export function verifyTrustedOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')
  if (!origin) {
    return '请求缺少来源信息'
  }

  const normalizedOrigin = normalizeOrigin(origin)
  if (!normalizedOrigin) {
    return '请求来源无效'
  }

  const trustedOrigins = getTrustedOrigins(request)
  if (!trustedOrigins.has(normalizedOrigin)) {
    return '请求来源不受信任'
  }

  return null
}

export function createForbiddenOriginResponse(message: string) {
  return NextResponse.json(
    { error: message },
    {
      status: 403,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
