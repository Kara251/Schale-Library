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
import type { Context } from 'hono'
import { fail, ok } from '../lib/respond'
import { verifyPassword } from '../auth/password'
import { createSession, deleteSession, getSessionUser, setSessionCookie, clearSessionCookie } from '../auth/session'
import { isAllowedAdminUser } from '../auth/roles'
import { checkLoginRateLimit, getClientIp, getSessionToken, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS } from '../auth/middleware'
import type { PanelEnv, PanelVars } from './types'

type AuthEnv = PanelEnv

export const authRoutes = new Hono<{ Bindings: AuthEnv; Variables: PanelVars }>()

interface PanelUserShape {
  id: number
  username: string
  email: string | null
  role: string
  blocked: number
}

/** 面板用户 → 契约 JSON（role 展开成 Strapi 的 {type,name} 形状）。 */
function serializeUser(user: PanelUserShape) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: { type: user.role, name: user.role },
    blocked: Boolean(user.blocked),
  }
}

type AuthResult =
  | { ok: true; token: string; user: PanelUserShape }
  | { ok: false; response: Response }

/**
 * 登录三步：IP 限流（fail-closed）→ 口令校验 → 角色白名单，通过后建会话。
 * /panel/auth/login 与 Strapi 兼容端点 /auth/local 共用，两者只是响应形状不同。
 */
async function authenticate(c: Context<{ Bindings: AuthEnv; Variables: PanelVars }>): Promise<AuthResult> {
  const ip = getClientIp(c as never)

  // IP 维度限流先行（fail-closed）
  const ipAllowed = await checkLoginRateLimit(c.env.DB, 'login', ip, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS)
  if (!ipAllowed) return { ok: false, response: fail(429, 'rate_limited') }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return { ok: false, response: fail(400, 'invalid_request') }
  }
  if (typeof body !== 'object' || body === null) {
    return { ok: false, response: fail(400, 'invalid_request') }
  }

  const identifier =
    typeof (body as { identifier?: unknown }).identifier === 'string'
      ? ((body as { identifier: string }).identifier.trim())
      : ''
  const password = typeof (body as { password?: unknown }).password === 'string' ? (body as { password: string }).password : ''
  if (!identifier || !password) return { ok: false, response: fail(400, 'invalid_request') }

  // identifier：用户名或邮箱
  const userRow = await c.env.DB.prepare(
    'SELECT id, username, email, password_hash, role, blocked FROM users WHERE username = ?1 OR email = ?1 LIMIT 1'
  )
    .bind(identifier)
    .first<{ id: number; username: string; email: string | null; password_hash: string; role: string; blocked: number }>()

  const passwordOk = userRow ? await verifyPassword(password, userRow.password_hash) : false
  if (!userRow || !passwordOk) {
    return { ok: false, response: fail(401, 'invalid_credentials') }
  }

  const user: PanelUserShape = {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    role: userRow.role,
    blocked: userRow.blocked,
  }

  // 角色白名单：无权限 → no_access（403），不建立会话
  if (!isAllowedAdminUser(user, c.env.ADMIN_PANEL_ALLOWED_ROLES, c.env.ENVIRONMENT === 'production')) {
    return { ok: false, response: fail(403, 'no_access') }
  }

  const token = await createSession(c.env.DB, user.id)
  return { ok: true, token, user }
}

authRoutes.post('/panel/auth/login', async (c) => {
  const result = await authenticate(c)
  if (!result.ok) return result.response

  setSessionCookie(c as never, result.token)
  return c.json({ data: { user: serializeUser(result.user) }, meta: {} })
})

/**
 * Strapi 兼容登录端点（契约 ADMIN_AUTH_CONTRACT.login）：前端服务端代理层调用，
 * 消费 jwt 后自行下发浏览器 cookie。这里的 jwt 就是会话 token，后续按 Bearer 校验。
 */
authRoutes.post('/auth/local', async (c) => {
  const result = await authenticate(c)
  if (!result.ok) return result.response

  return c.json({ jwt: result.token, user: serializeUser(result.user) })
})

authRoutes.get('/panel/auth/session', async (c) => {
  const token = getSessionToken(c as never)
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
  const token = getSessionToken(c as never)
  if (token) {
    await deleteSession(c.env.DB, token)
  }
  clearSessionCookie(c as never)
  // 必须走 c.json()（而非新建 Response），否则 c.header() 设置的 Set-Cookie 会丢失
  return c.json({ data: { success: true }, meta: {} })
})

/**
 * Strapi 兼容当前用户端点（契约 ADMIN_AUTH_CONTRACT.fetchStrapiCurrentUser）。
 * Bearer 校验，用户对象不加 {data,meta} 包装 —— 前端直接把响应体当 AdminUser 用。
 */
authRoutes.get('/users/me', async (c) => {
  const token = getSessionToken(c as never)
  const user = await getSessionUser(c.env.DB, token)
  if (!user) return fail(401, 'unauthorized')

  const shape: PanelUserShape = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    blocked: 0,
  }
  if (!isAllowedAdminUser(shape, c.env.ADMIN_PANEL_ALLOWED_ROLES, c.env.ENVIRONMENT === 'production')) {
    return fail(403, 'no_access')
  }

  return c.json(serializeUser(shape))
})

/**
 * 前端服务端限流后端（契约 RATE_LIMIT_CONTRACT）。前端对登录、图片代理等路径
 * 调用本端点，拿不到 allowed:true 就 fail-closed。
 * PANEL_INTERNAL_TOKEN 已配置时强制校验 x-panel-internal-token，防止被外部当限流器刷。
 */
authRoutes.post('/panel/internal/rate-limit', async (c) => {
  const expected = c.env.PANEL_INTERNAL_TOKEN
  if (expected) {
    const provided = c.req.header('x-panel-internal-token')
    if (!provided || !timingSafeEqual(provided, expected)) return fail(403, 'forbidden')
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return fail(400, 'invalid_request')
  }
  if (typeof body !== 'object' || body === null) return fail(400, 'invalid_request')

  const { scope, identifier, limit, windowMs } = body as Record<string, unknown>
  if (typeof scope !== 'string' || !scope.trim()) return fail(400, 'invalid_request')
  if (typeof identifier !== 'string' || !identifier.trim()) return fail(400, 'invalid_request')
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) return fail(400, 'invalid_request')
  if (typeof windowMs !== 'number' || !Number.isFinite(windowMs) || windowMs <= 0) return fail(400, 'invalid_request')

  const allowed = await checkLoginRateLimit(
    c.env.DB,
    scope.trim(),
    identifier.trim(),
    Math.floor(limit),
    Math.floor(windowMs)
  )
  return c.json({ allowed })
})

/** 恒定时间比较，避免用响应耗时探测内部令牌。 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
