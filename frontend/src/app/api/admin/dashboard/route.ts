import { NextResponse } from 'next/server'

import { getAdminDashboardItems } from '@/lib/server/admin-content'
import { getAdminSession } from '@/lib/server/admin-auth'
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

export async function GET(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const url = new URL(request.url)
  const locale = url.searchParams.get('locale') || 'zh-Hans'

  try {
    const items = await getAdminDashboardItems(session, locale)
    return NextResponse.json(
      { items },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    return toErrorResponse(error, '仪表盘数据读取失败')
  }
}
