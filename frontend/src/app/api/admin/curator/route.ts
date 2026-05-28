import { NextRequest, NextResponse } from 'next/server'

import { getCuratorAdmin, updateCuratorAdmin } from '@/lib/server/admin-content'
import { getAdminSession } from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'

export async function GET(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const locale = request.nextUrl.searchParams.get('locale') || undefined

  try {
    const data = await getCuratorAdmin(session, locale)
    return NextResponse.json(data, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '读取失败' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const originError = verifyTrustedOrigin(request)
  if (originError) return createForbiddenOriginResponse(originError)

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  let body: { data?: Record<string, unknown>; locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体格式无效' }, { status: 400 })
  }

  if (!body.data || typeof body.data !== 'object') {
    return NextResponse.json({ error: '缺少 data 字段' }, { status: 400 })
  }

  try {
    const result = await updateCuratorAdmin(session, body.data, body.locale)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    )
  }
}
