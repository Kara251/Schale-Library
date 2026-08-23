/**
 * /panel 会话校验中间件：除登录外的全部路由 fail-closed 校验会话。
 * 登录限流：身份取 CF-Connecting-IP（缺失回退 'unknown'），
 * 记录写 D1 rate_limit_records 表，窗口 10min / 30 次。
 */
import type { Context, Next } from 'hono'
import { fail } from '../lib/respond'
import { getSessionUser } from './session'
import { isAllowedAdminUser } from './roles'
import type { PanelEnv, PanelVars } from '../panel/types'

export type PanelContext = Context<{ Bindings: PanelEnv; Variables: PanelVars }>

export const LOGIN_IP_LIMIT = 30
export const LOGIN_WINDOW_MS = 10 * 60 * 1000

/** CF-Connecting-IP 优先；缺失回退 'unknown'。 */
export function getClientIp(c: PanelContext): string {
  return c.req.header('CF-Connecting-IP')?.trim() || 'unknown'
}

/**
 * 固定窗口限流（D1 rate_limit_records：scope + identifier 唯一一行）。
 * 窗口未过期且 count >= limit → 拒绝；否则计数 +1 放行。
 * DB 故障时按 fail-closed 处理（拒绝请求）。
 */
export async function checkLoginRateLimit(
  db: D1Database,
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): Promise<boolean> {
  try {
    const existing = await db
      .prepare('SELECT id, count, reset_at FROM rate_limit_records WHERE scope = ?1 AND identifier = ?2')
      .bind(scope, identifier)
      .first<{ id: number; count: number; reset_at: number }>()

    if (!existing || existing.reset_at <= now) {
      const resetAt = now + windowMs
      if (existing) {
        await db
          .prepare('UPDATE rate_limit_records SET count = 1, reset_at = ?1 WHERE id = ?2')
          .bind(resetAt, existing.id)
          .run()
      } else {
        await db
          .prepare(
            'INSERT INTO rate_limit_records (scope, identifier, key, count, reset_at, created_at) VALUES (?1, ?2, ?3, 1, ?4, ?5)'
          )
          .bind(scope, identifier, `${scope}:${identifier}`, resetAt, now)
          .run()
      }
      return true
    }

    if (existing.count >= limit) return false

    await db
      .prepare('UPDATE rate_limit_records SET count = count + 1 WHERE id = ?1')
      .bind(existing.id)
      .run()
    return true
  } catch {
    // fail-closed：限流状态不可用时拒绝登录
    return false
  }
}

type AppEnv = PanelEnv & Record<string, unknown>

/**
 * 全部 /panel 路由（login、bootstrap、internal rate-limit 除外）的前置校验。
 * 无有效会话 → 401；角色不在白名单 → 403 no_access。
 */
export async function requirePanelSession(
  c: PanelContext,
  next: Next
): Promise<Response | undefined> {
  const token = getCookieValue(c.req.header('Cookie'), 'schale_admin_session')
  const user = await getSessionUser(c.env.DB, token)

  if (!user) {
    return fail(401, 'unauthorized')
  }
  if (
    !isAllowedAdminUser(user, c.env.ADMIN_PANEL_ALLOWED_ROLES, c.env.ENVIRONMENT === 'production')
  ) {
    return fail(403, 'no_access')
  }

  c.set('panelUser', user)
  c.set('sessionToken', token!)
  await next()
  return undefined
}

function getCookieValue(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      return part.slice(eq + 1).trim()
    }
  }
  return undefined
}
