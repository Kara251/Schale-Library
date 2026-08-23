/**
 * 管理面板会话：随机 token 存 D1 sessions 表，cookie 只携带 token id。
 * 会话校验 fail-closed：任何一步失败都按未登录处理；查表即时吊销（删行即失效）。
 */
import type { Context } from 'hono'
import type { PanelEnv, PanelUser } from '../panel/types'

export const SESSION_COOKIE = 'schale_admin_session'
export const SESSION_TTL_SECONDS = 8 * 60 * 60

export interface SessionCookieOptions {
  httpOnly: true
  secure: boolean
  sameSite: 'strict'
  path: string
  maxAge: number
}

export function sessionCookieOptions(production: boolean): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}

function serializeCookie(name: string, value: string, options: SessionCookieOptions): string {
  const parts = [`${name}=${value}`, `Path=${options.path}`, 'SameSite=Strict', `Max-Age=${options.maxAge}`]
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

/** 下发会话 cookie：挂在 c.res 上，确保后续 Response.json 也携带。 */
export function setSessionCookie(c: Context<{ Bindings: PanelEnv }>, token: string): void {
  const options = sessionCookieOptions(c.env.ENVIRONMENT === 'production')
  c.header('Set-Cookie', serializeCookie(SESSION_COOKIE, token, options))
}

/** 清 cookie：同时下发过期头，确保浏览器侧立即失效。 */
export function clearSessionCookie(c: Context<{ Bindings: PanelEnv }>): void {
  const options = sessionCookieOptions(c.env.ENVIRONMENT === 'production')
  c.header('Set-Cookie', `${SESSION_COOKIE}=; Path=${options.path}; SameSite=Strict; Max-Age=0${options.secure ? '; Secure' : ''}${options.httpOnly ? '; HttpOnly' : ''}`)
}

const TOKEN_BYTES = 32

/**
 * 会话行的主键存的是 token 的 SHA-256，不是 token 本身。
 * 明文存储意味着任何一次数据库读取泄露（冷备、导出、控制台）都等于
 * 直接拿到全部有效登录态；存摘要后泄露的内容不可用于冒充。
 * token 是 32 字节随机值，不存在字典攻击面，无需加盐。
 */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return toHex(new Uint8Array(digest))
}

export async function createSession(db: D1Database, userId: number, now = Date.now()): Promise<string> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)))
  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(await hashToken(token), userId, now + SESSION_TTL_SECONDS * 1000, now)
    .run()
  return token
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?1').bind(await hashToken(token)).run()
}

/** 顺带清理已过期的会话行，避免表无限膨胀。 */
export async function pruneExpiredSessions(db: D1Database, now = Date.now()): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?1').bind(now).run()
}

/**
 * 解析当前会话对应用户。fail-closed：
 * 无 cookie / 无会话行 / 已过期 / 用户缺失或被禁用 → 一律返回 null。
 * 每次调用实时查 sessions 表，删除会话行即即时吊销。
 */
export async function getSessionUser(
  db: D1Database,
  token: string | undefined,
  now = Date.now()
): Promise<PanelUser | null> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null

  const tokenHash = await hashToken(token)
  const row = await db
    .prepare(
      `SELECT s.expires_at AS expires_at, u.id AS user_id, u.username AS username,
              u.email AS email, u.role AS role, u.blocked AS blocked
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?1`
    )
    .bind(tokenHash)
    .first<{
      expires_at: number
      user_id: number
      username: string
      email: string | null
      role: string
      blocked: number
    }>()

  if (!row) return null
  // 过期即吊销：删行并拒绝
  if (row.expires_at <= now) {
    await deleteSession(db, token)
    return null
  }
  if (row.blocked) return null

  return {
    id: row.user_id,
    username: row.username,
    email: row.email,
    role: row.role,
  }
}

function toHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) hex += bytes[i]!.toString(16).padStart(2, '0')
  return hex
}
