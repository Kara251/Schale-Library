import { NextRequest, NextResponse } from 'next/server'

import { getAdminSession } from '@/lib/server/admin-auth'
import { adminPanelFetch } from '@/lib/server/admin-content'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'
import { toErrorResponse } from '@/lib/server/admin-route'

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const data = await adminPanelFetch(session, '/api/panel/users/me')
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '个人资料读取失败')
  }
}

export async function PUT(request: NextRequest) {
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
    const data = await adminPanelFetch(session, '/api/panel/users/me', { method: 'PUT', body })
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '个人资料更新失败')
  }
}
