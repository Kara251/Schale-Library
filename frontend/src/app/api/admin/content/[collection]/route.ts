import { NextRequest, NextResponse } from 'next/server'

import {
  ADMIN_COLLECTION_CONFIG,
  createAdminCollectionItem,
  listAdminCollection,
} from '@/lib/server/admin-content'
import type { AdminCollectionKey } from '@/lib/admin-panel'
import { AdminApiError } from '@/lib/admin-panel/client'
import { getAdminSession } from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'

function isAdminCollectionKey(value: string): value is AdminCollectionKey {
  return value in ADMIN_COLLECTION_CONFIG
}

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ collection: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { collection } = await context.params
  if (!isAdminCollectionKey(collection)) {
    return NextResponse.json({ error: '不支持的内容类型' }, { status: 404 })
  }
  const collectionKey = collection as AdminCollectionKey

  const searchParams = request.nextUrl.searchParams
  const page = Number(searchParams.get('page') || '1')
  const pageSize = Number(searchParams.get('pageSize') || '12')
  const search = searchParams.get('search') || undefined
  const statusParam = searchParams.get('status')
  const status = statusParam === 'draft' || statusParam === 'published' ? statusParam : 'all'
  const locale = searchParams.get('locale') || undefined

  try {
    const data = await listAdminCollection(session, collectionKey, {
      page,
      pageSize,
      search,
      status,
      locale,
    })

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return toErrorResponse(error, '内容读取失败')
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ collection: string }> }
) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { collection } = await context.params
  if (!isAdminCollectionKey(collection)) {
    return NextResponse.json({ error: '不支持的内容类型' }, { status: 404 })
  }
  const collectionKey = collection as AdminCollectionKey

  try {
    const body = (await request.json()) as { data?: Record<string, unknown>; locale?: string }
    const data = await createAdminCollectionItem(
      session,
      collectionKey,
      body.data || {},
      body.locale
    )

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error, '内容创建失败')
  }
}
