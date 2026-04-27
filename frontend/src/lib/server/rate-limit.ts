import 'server-only'

import type { NextRequest } from 'next/server'

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'
const INTERNAL_RATE_LIMIT_TIMEOUT_MS = 3000

interface RateLimitOptions {
  scope: string
  identifier: string
  limit: number
  windowMs: number
  failClosed?: boolean
}

interface RateLimitResponse {
  allowed?: boolean
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip') || 'unknown'
}

export async function checkServerRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
  failClosed = true,
}: RateLimitOptions): Promise<boolean> {
  const internalToken = process.env.PANEL_INTERNAL_TOKEN

  if (!internalToken && process.env.NODE_ENV === 'production') {
    return !failClosed
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), INTERNAL_RATE_LIMIT_TIMEOUT_MS)

  try {
    const response = await fetch(`${STRAPI_URL}/api/panel/internal/rate-limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(internalToken ? { 'x-panel-internal-token': internalToken } : {}),
      },
      body: JSON.stringify({ scope, identifier, limit, windowMs }),
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      return !failClosed
    }

    const payload = (await response.json().catch(() => null)) as RateLimitResponse | null
    return payload?.allowed === true
  } catch {
    return !failClosed
  } finally {
    clearTimeout(timeoutId)
  }
}
