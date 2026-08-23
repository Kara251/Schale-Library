import { NextRequest, NextResponse } from 'next/server'

import { getCuratorAdmin, updateCuratorAdmin } from '@/lib/server/admin-content'
import { getAdminSession } from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'
import { AdminApiError } from '@/lib/admin-panel/client'

/**
 * 后端错误原样透传：保留状态码与错误码。
 * 此前一律回 500，「内容不存在」「字段非法」在界面上和服务端故障无从区分。
 */
function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof AdminApiError) {
    return NextResponse.json(
      { error: error.code || error.message, status: error.status },
      { status: error.status }
    )
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: 500 }
  )
}

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
    return toErrorResponse(error, '读取失败')
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
    return toErrorResponse(error, '保存失败')
  }
}
