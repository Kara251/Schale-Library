import { NextResponse } from 'next/server'

import { getAdminSession } from '@/lib/server/admin-auth'

export async function GET() {
  const session = await getAdminSession()

  // 未登录是常态而非错误：AuthProvider 在每个页面都会探测会话，
  // 返回 401 会让每位访客都在 Workers 日志和浏览器控制台里留下一条 4xx 噪音。
  if (!session) {
    return NextResponse.json(
      { user: null },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    { user: session.user },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
