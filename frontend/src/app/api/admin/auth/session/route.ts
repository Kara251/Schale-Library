import { NextResponse } from 'next/server'

import { getAdminSession } from '@/lib/server/admin-auth'

export async function GET() {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json(
      { user: null },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    { user: session.user },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
