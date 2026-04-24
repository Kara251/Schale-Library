import { NextRequest, NextResponse } from 'next/server'

import {
  ADMIN_COLLECTION_CONFIG,
  deleteAdminCollectionItem,
  getAdminCollectionItem,
  updateAdminCollectionItem,
} from '@/lib/server/admin-content'
import type { AdminCollectionKey } from '@/lib/admin-panel'
import { getAdminSession } from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'

function isAdminCollectionKey(value: string): value is AdminCollectionKey {
  return value in ADMIN_COLLECTION_CONFIG
}

async function getRouteParams(context: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await context.params
  return { collection, id: Number(id) }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ collection: string; id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { collection, id } = await getRouteParams(context)
  if (!isAdminCollectionKey(collection)) {
    return NextResponse.json({ error: '不支持的内容类型' }, { status: 404 })
  }
  const collectionKey = collection as AdminCollectionKey

  try {
    const locale = request.nextUrl.searchParams.get('locale') || undefined
    const data = await getAdminCollectionItem(session, collectionKey, id, locale)
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '内容读取失败' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ collection: string; id: string }> }
) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { collection, id } = await getRouteParams(context)
  if (!isAdminCollectionKey(collection)) {
    return NextResponse.json({ error: '不支持的内容类型' }, { status: 404 })
  }
  const collectionKey = collection as AdminCollectionKey

  try {
    const body = (await request.json()) as { data?: Record<string, unknown>; locale?: string }
    const data = await updateAdminCollectionItem(session, collectionKey, id, body.data || {}, body.locale)
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '内容更新失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collection: string; id: string }> }
) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { collection, id } = await getRouteParams(context)
  if (!isAdminCollectionKey(collection)) {
    return NextResponse.json({ error: '不支持的内容类型' }, { status: 404 })
  }
  const collectionKey = collection as AdminCollectionKey

  try {
    const locale = request.nextUrl.searchParams.get('locale') || undefined
    const result = await deleteAdminCollectionItem(session, collectionKey, id, locale)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '内容删除失败' },
      { status: 500 }
    )
  }
}