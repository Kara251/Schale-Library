import { NextRequest, NextResponse } from 'next/server'

import { getAdminSession } from '@/lib/server/admin-auth'
import { adminPanelFetch } from '@/lib/server/admin-content'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'
import { toErrorResponse } from '@/lib/server/admin-route'

/** 管理员重置他人密码。Worker 侧会吊销目标用户的全部会话。 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    const data = await adminPanelFetch(session, `/api/panel/users/${encodeURIComponent(id)}/password`, {
      method: 'POST',
      body,
    })
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '密码重置失败')
  }
}
