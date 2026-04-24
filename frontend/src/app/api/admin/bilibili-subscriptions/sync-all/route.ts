import { NextRequest, NextResponse } from 'next/server'

import { syncAllBilibiliSubscriptions } from '@/lib/server/admin-content'
import { getAdminSession } from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'

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
    const result = await syncAllBilibiliSubscriptions(session)
    return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量同步失败' },
      { status: 500 }
    )
  }
}