import { NextRequest, NextResponse } from 'next/server'

import { getAdminSession } from '@/lib/server/admin-auth'
import { adminPanelFetch } from '@/lib/server/admin-content'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'
import { toErrorResponse } from '@/lib/server/admin-route'
import { checkServerRateLimit, getClientIp } from '@/lib/server/rate-limit'

/** 改密码要校验原密码，属于口令校验路径，按 IP 限流，避免被当作口令探测入口。 */
const PASSWORD_RATE_LIMIT = 10
const PASSWORD_RATE_WINDOW = 10 * 60 * 1000

export async function POST(request: NextRequest) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const allowed = await checkServerRateLimit({
    scope: 'admin-password-change',
    identifier: getClientIp(request),
    limit: PASSWORD_RATE_LIMIT,
    windowMs: PASSWORD_RATE_WINDOW,
    failClosed: true,
  })
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const data = await adminPanelFetch(session, '/api/panel/users/me/password', { method: 'POST', body })
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '密码修改失败')
  }
}
