import { NextRequest, NextResponse } from 'next/server'

import { syncBilibiliSubscription } from '@/lib/server/admin-content'
import { getAdminSession } from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { id } = await context.params
  const subscriptionId = Number(id)
  if (!Number.isFinite(subscriptionId)) {
    return NextResponse.json({ error: '订阅 ID 无效' }, { status: 400 })
  }

  try {
    const result = await syncBilibiliSubscription(session, subscriptionId)
    return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '单条同步失败' },
      { status: 500 }
    )
  }
}