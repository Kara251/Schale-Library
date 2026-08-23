import { NextRequest, NextResponse } from 'next/server'

import {
  ADMIN_COLLECTION_CONFIG,
  deleteAdminCollectionItem,
  getAdminCollectionItem,
  updateAdminCollectionItem,
} from '@/lib/server/admin-content'
import type { AdminCollectionKey } from '@/lib/admin-panel'
import { AdminApiError } from '@/lib/admin-panel/client'
import { getAdminSession } from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'

function isAdminCollectionKey(value: string): value is AdminCollectionKey {
  return value in ADMIN_COLLECTION_CONFIG
}

/**
 * 路由段里的 id 是新后端的 documentId（24 位十六进制字符串），不是数字主键。
 * 此前这里做了 Number(id)，非数字 documentId 一律变成 NaN，
 * 打到 /api/panel/<集合>/NaN —— 后台的读取单条、更新、删除全部失效。
 */
async function getRouteParams(context: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await context.params
  return { collection, documentId: id }
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
  context: { params: Promise<{ collection: string; id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { collection, documentId } = await getRouteParams(context)
  if (!isAdminCollectionKey(collection)) {
    return NextResponse.json({ error: '不支持的内容类型' }, { status: 404 })
  }
  const collectionKey = collection as AdminCollectionKey

  try {
    const locale = request.nextUrl.searchParams.get('locale') || undefined
    const data = await getAdminCollectionItem(session, collectionKey, documentId, locale)
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '内容读取失败')
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

  const { collection, documentId } = await getRouteParams(context)
  if (!isAdminCollectionKey(collection)) {
    return NextResponse.json({ error: '不支持的内容类型' }, { status: 404 })
  }
  const collectionKey = collection as AdminCollectionKey

  try {
    const body = (await request.json()) as { data?: Record<string, unknown>; locale?: string }
    const data = await updateAdminCollectionItem(session, collectionKey, documentId, body.data || {}, body.locale)
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '内容更新失败')
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

  const { collection, documentId } = await getRouteParams(context)
  if (!isAdminCollectionKey(collection)) {
    return NextResponse.json({ error: '不支持的内容类型' }, { status: 404 })
  }
  const collectionKey = collection as AdminCollectionKey

  try {
    const locale = request.nextUrl.searchParams.get('locale') || undefined
    const result = await deleteAdminCollectionItem(session, collectionKey, documentId, locale)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return toErrorResponse(error, '内容删除失败')
  }
}