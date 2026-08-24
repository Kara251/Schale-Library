import { NextRequest, NextResponse } from 'next/server'

import { getAdminSession } from '@/lib/server/admin-auth'
import { adminPanelFetch } from '@/lib/server/admin-content'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'
import { toErrorResponse } from '@/lib/server/admin-route'

/**
 * 用户管理。权限（仅 admin）由 Worker 端强制，这里只做会话与来源校验 ——
 * 前端隐藏入口不能当作授权手段。
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const qs = request.nextUrl.searchParams.toString()
    const data = await adminPanelFetch(session, `/api/panel/users${qs ? `?${qs}` : ''}`)
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '用户列表读取失败')
  }
}

export async function POST(request: NextRequest) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const data = await adminPanelFetch(session, '/api/panel/users', { method: 'POST', body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return toErrorResponse(error, '用户创建失败')
  }
}
