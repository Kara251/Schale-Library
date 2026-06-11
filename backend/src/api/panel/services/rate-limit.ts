import { errors } from '@strapi/utils'
import crypto from 'node:crypto'

import { toNumber } from './query-utils'

const { ApplicationError } = errors

const RATE_LIMIT_UID = 'api::rate-limit-record.rate-limit-record' as any
const RATE_LIMIT_TABLE = 'rate_limit_records'
const DEFAULT_RATE_LIMIT = 60
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000

function getInternalSecret() {
  return process.env.PANEL_INTERNAL_TOKEN || process.env.RATE_LIMIT_HASH_SECRET || process.env.APP_KEYS || 'development-rate-limit-secret'
}

function validateInternalToken(ctx: any) {
  const expectedToken = process.env.PANEL_INTERNAL_TOKEN

  if (!expectedToken) {
    if (process.env.NODE_ENV === 'production') {
      throw new ApplicationError('未配置内部接口令牌')
    }

    strapi.log.warn('PANEL_INTERNAL_TOKEN 未配置，仅允许开发环境使用内部限流接口')
    return
  }

  const providedToken = String(ctx.request.headers['x-panel-internal-token'] || '')
  const expected = Buffer.from(expectedToken)
  const provided = Buffer.from(providedToken)

  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    throw new ApplicationError('内部接口令牌无效')
  }
}

function hashRateLimitKey(scope: string, identifier: string) {
  return crypto
    .createHmac('sha256', getInternalSecret())
    .update(`${scope}:${identifier}`)
    .digest('hex')
}

function normalizeRateLimitInput(ctx: any) {
  const body = ctx.request.body || {}
  const scope = typeof body.scope === 'string' ? body.scope.trim().slice(0, 80) : ''
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim().slice(0, 256) : ''
  const limit = Math.min(1000, Math.max(1, toNumber(body.limit, DEFAULT_RATE_LIMIT)))
  const windowMs = Math.min(60 * 60 * 1000, Math.max(1000, toNumber(body.windowMs, DEFAULT_RATE_LIMIT_WINDOW_MS)))

  if (!scope || !identifier) {
    throw new ApplicationError('限流参数无效')
  }

  return { scope, identifier, limit, windowMs }
}

function isUniqueConstraintError(error: unknown) {
  const code = (error as { code?: string })?.code
  const message = (error as Error)?.message || ''
  return code === '23505' || code === 'SQLITE_CONSTRAINT' || /unique constraint/i.test(message)
}

async function cleanupExpiredRateLimits(now: Date) {
  if (Math.random() > 0.02) {
    return
  }

  try {
    await strapi.db.query(RATE_LIMIT_UID).deleteMany({
      where: {
        resetAt: {
          $lt: now.toISOString(),
        },
      },
    })
  } catch (error) {
    strapi.log.warn(`清理限流记录失败: ${(error as Error).message}`)
  }
}

async function updateRateLimitWindow(input: {
  key: string
  scope: string
  limit: number
  windowMs: number
  now: Date
}) {
  const { key, scope, limit, windowMs, now } = input
  const resetAt = new Date(now.getTime() + windowMs)
  const nowIso = now.toISOString()
  const resetAtIso = resetAt.toISOString()

  return strapi.db.connection.transaction(async (trx: any) => {
    const table = strapi.db.connection(RATE_LIMIT_TABLE).transacting(trx)
    const recordQuery = table
      .select(['id', 'count', 'reset_at'])
      .where({ key })
      .first()

    const client = String(strapi.db.connection?.client?.config?.client || '')
    if (!client.includes('sqlite') && typeof recordQuery.forUpdate === 'function') {
      recordQuery.forUpdate()
    }

    const record = await recordQuery as { id: number; count?: number; reset_at?: string } | undefined

    if (!record || !record.reset_at || new Date(record.reset_at).getTime() <= now.getTime()) {
      const data = {
        key,
        scope,
        count: 1,
        reset_at: resetAtIso,
        updated_at: nowIso,
      }

      if (record) {
        await table.where({ id: record.id }).update(data)
      } else {
        await table.insert({
          ...data,
          created_at: nowIso,
        })
      }

      return {
        allowed: true,
        remaining: Math.max(0, limit - 1),
        resetAt: resetAtIso,
      }
    }

    const currentCount = Number(record.count || 0)
    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.reset_at,
      }
    }

    await table.where({ id: record.id }).update({
      count: currentCount + 1,
      updated_at: nowIso,
    })

    return {
      allowed: true,
      remaining: Math.max(0, limit - currentCount - 1),
      resetAt: record.reset_at,
    }
  })
}

export async function checkRateLimit(ctx: any) {
  validateInternalToken(ctx)

  const { scope, identifier, limit, windowMs } = normalizeRateLimitInput(ctx)
  const now = new Date()
  const key = hashRateLimitKey(scope, identifier)

  await cleanupExpiredRateLimits(now)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await updateRateLimitWindow({ key, scope, limit, windowMs, now })
    } catch (error) {
      if (attempt === 0 && isUniqueConstraintError(error)) {
        continue
      }
      throw error
    }
  }

  throw new ApplicationError('限流状态更新失败')
}
