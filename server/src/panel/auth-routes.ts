/**
 * 认证路由：
 * - POST /panel/auth/login {identifier,password} → 会话 cookie + user
 *   错误码对齐旧后端：rate_limited(429) / invalid_credentials(401) / no_access(403)
 * - GET  /panel/auth/session → 当前用户或 401
 * - POST /panel/auth/logout → 删会话行 + 清 cookie
 *
 * 注意：需要携带 Set-Cookie 的响应必须经 c.json() 输出（context 头合并），
 * 直接 Response.json 会丢弃 c.header() 设置的 cookie。
 */
import { Hono } from 'hono'
import { fail, ok } from '../lib/respond'
import { verifyPassword } from '../auth/password'
import { createSession, deleteSession, getSessionUser, setSessionCookie, clearSessionCookie } from '../auth/session'
import { isAllowedAdminUser } from '../auth/roles'
import { checkLoginRateLimit, getClientIp, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS } from '../auth/middleware'
import type { PanelEnv, PanelVars } from './types'

type AuthEnv = PanelEnv

export const authRoutes = new Hono<{ Bindings: AuthEnv; Variables: PanelVars }>()

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return undefined
}

authRoutes.post('/panel/auth/login', async (c) => {
  const ip = getClientIp(c as never)

  // IP 维度限流先行（fail-closed）
  const ipAllowed = await checkLoginRateLimit(c.env.DB, 'login', ip, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS)
  if (!ipAllowed) return fail(429, 'rate_limited')

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return fail(400, 'invalid_request')
  }
  if (typeof body !== 'object' || body === null) return fail(400, 'invalid_request')

  const identifier =
    typeof (body as { identifier?: unknown }).identifier === 'string'
      ? ((body as { identifier: string }).identifier.trim())
      : ''
  const password = typeof (body as { password?: unknown }).password === 'string' ? (body as { password: string }).password : ''
  if (!identifier || !password) return fail(400, 'invalid_request')

  // identifier：用户名或邮箱
  const userRow = await c.env.DB.prepare(
    'SELECT id, username, email, password_hash, role, blocked FROM users WHERE username = ?1 OR email = ?1 LIMIT 1'
  )
    .bind(identifier)
    .first<{ id: number; username: string; email: string | null; password_hash: string; role: string; blocked: number }>()

  const passwordOk = userRow ? await verifyPassword(password, userRow.password_hash) : false
  if (!userRow || !passwordOk) {
    return fail(401, 'invalid_credentials')
  }

  const user = { id: userRow.id, username: userRow.username, email: userRow.email, role: userRow.role, blocked: userRow.blocked }

  // 角色白名单：无权限 → no_access（403），不建立会话
  if (!isAllowedAdminUser(user, c.env.ADMIN_PANEL_ALLOWED_ROLES, c.env.ENVIRONMENT === 'production')) {
    return fail(403, 'no_access')
  }

  const token = await createSession(c.env.DB, user.id)
  setSessionCookie(c as never, token)

  return c.json({
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: { type: user.role, name: user.role },
        blocked: Boolean(user.blocked),
      },
    },
    meta: {},
  })
})

authRoutes.get('/panel/auth/session', async (c) => {
  const token = parseCookie(c.req.header('Cookie'), 'schale_admin_session')
  const user = await getSessionUser(c.env.DB, token)
  if (!user) return fail(401, 'unauthorized')

  const allowed = isAllowedAdminUser(
    { role: user.role, blocked: 0 },
    c.env.ADMIN_PANEL_ALLOWED_ROLES,
    c.env.ENVIRONMENT === 'production'
  )
  if (!allowed) return fail(403, 'no_access')

  return ok({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: { type: user.role, name: user.role },
      blocked: false,
    },
  })
})

authRoutes.post('/panel/auth/logout', async (c) => {
  const token = parseCookie(c.req.header('Cookie'), 'schale_admin_session')
  if (token) {
    await deleteSession(c.env.DB, token)
  }
  clearSessionCookie(c as never)
  // 必须走 c.json()（而非新建 Response），否则 c.header() 设置的 Set-Cookie 会丢失
  return c.json({ data: { success: true }, meta: {} })
})
