import { NextRequest, NextResponse } from 'next/server'

import { getAdminSession } from '@/lib/server/admin-auth'

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'

export async function GET(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const response = await fetch(`${STRAPI_URL}/api/panel/admin-audit-logs/export?${request.nextUrl.searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to export audit logs' }, { status: response.status })
  }

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'text/csv; charset=utf-8',
      'Content-Disposition': response.headers.get('content-disposition') || 'attachment; filename="admin-audit-logs.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
