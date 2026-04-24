import { NextRequest, NextResponse } from 'next/server'

import {
  ADMIN_SESSION_COOKIE,
  fetchStrapiCurrentUser,
  getAdminSessionCookieOptions,
} from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'
const LOGIN_RATE_LIMIT = 10
const LOGIN_RATE_WINDOW = 10 * 60 * 1000

const loginAttemptMap = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.headers.get('x-real-ip') || 'unknown'
}

function isLoginAllowed(ip: string): boolean {
  const now = Date.now()
  const record = loginAttemptMap.get(ip)

  if (!record || now >= record.resetAt) {
    loginAttemptMap.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW })
    return true
  }

  if (record.count >= LOGIN_RATE_LIMIT) {
    return false
  }

  record.count += 1
  return true
}

export async function POST(request: NextRequest) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const clientIp = getClientIp(request)
  if (!isLoginAllowed(clientIp)) {
    return NextResponse.json({ error: '登录尝试过于频繁，请稍后再试' }, { status: 429 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体无效' }, { status: 400 })
  }

  const identifier = typeof (body as { identifier?: unknown }).identifier === 'string'
    ? (body as { identifier: string }).identifier.trim()
    : ''
  const password = typeof (body as { password?: unknown }).password === 'string'
    ? (body as { password: string }).password
    : ''

  if (!identifier || !password) {
    return NextResponse.json({ error: '账号和密码不能为空' }, { status: 400 })
  }

  const loginResponse = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier, password }),
    cache: 'no-store',
  })

  const loginPayload = (await loginResponse.json().catch(() => null)) as
    | { jwt?: string; error?: { message?: string } }
    | null

  if (!loginResponse.ok || !loginPayload?.jwt) {
    return NextResponse.json(
      { error: loginPayload?.error?.message || '登录失败，请检查账号或密码' },
      { status: loginResponse.status || 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const user = await fetchStrapiCurrentUser(loginPayload.jwt)
  if (!user) {
    return NextResponse.json(
      { error: '当前账号没有后台面板访问权限' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const response = NextResponse.json(
    { user },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )

  loginAttemptMap.delete(clientIp)
  response.cookies.set(ADMIN_SESSION_COOKIE, loginPayload.jwt, getAdminSessionCookieOptions())
  return response
}
