import 'server-only'

import { NextResponse } from 'next/server'

import { AdminApiError } from '@/lib/admin-panel/client'

/**
 * 后端错误原样透传：保留状态码与错误码。
 * 不这么做的话「内容不存在」「字段非法」「权限不足」在界面上和服务端故障无从区分，
 * 用户只会看到一个笼统的 500。
 */
export function toErrorResponse(error: unknown, fallbackMessage: string) {
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
