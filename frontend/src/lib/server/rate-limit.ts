import 'server-only'

import type { NextRequest } from 'next/server'

import { STRAPI_API_URL as STRAPI_URL } from '@/lib/config'
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
  // 取 x-forwarded-for 的最后一跳：它由最近的可信代理写入，
  // 客户端自带的伪造值只会出现在更前面的位置。
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const hops = forwardedFor.split(',').map((part) => part.trim()).filter(Boolean)
    if (hops.length > 0) {
      return hops[hops.length - 1]
    }
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
