import { NextRequest, NextResponse } from 'next/server'

import { getAdminSession } from '@/lib/server/admin-auth'
import { adminPanelFetch } from '@/lib/server/admin-content'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'
import { toErrorResponse } from '@/lib/server/admin-route'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { id } = await context.params
  try {
    const body = (await request.json()) as Record<string, unknown>
    const data = await adminPanelFetch(session, `/api/panel/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
    })
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '用户更新失败')
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { id } = await context.params
  try {
    const data = await adminPanelFetch(session, `/api/panel/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '用户删除失败')
  }
}
