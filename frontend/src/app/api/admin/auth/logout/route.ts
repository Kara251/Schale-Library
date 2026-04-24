import { NextResponse } from 'next/server'

import { ADMIN_SESSION_COOKIE } from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'

export async function POST(request: Request) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const response = NextResponse.json({}, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  })

  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
