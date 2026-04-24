import { NextResponse } from 'next/server'

import { getAdminDashboardItems } from '@/lib/server/admin-content'
import { getAdminSession } from '@/lib/server/admin-auth'

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '仪表盘数据读取失败' },
      { status: 500 }
    )
  }
}
