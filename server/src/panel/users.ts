/**
 * 用户管理与个人设置。
 *
 * 分两档权限：
 * - 自助（任何已登录维护者）：改自己的密码、改自己的邮箱。
 * - 用户管理（仅 admin）：列出、新建、改角色、封禁/解封、重置密码、删除。
 *
 * 防自锁与防失控的护栏（全部在服务端强制，不依赖前端隐藏按钮）：
 * - 不能封禁 / 降级 / 删除自己；
 * - 不能移除最后一个未封禁的 admin；
 * 否则一次误操作就再也进不来后台。
 */
import type { Context } from 'hono'
import { fail, ok, okPaginated, paginationOf } from '../lib/respond'
import { hashPassword, verifyPassword } from '../auth/password'
import { hashToken } from '../auth/session'
import { recordAuditLog } from './audit'
import type { PanelEnv, PanelVars } from './types'

type UsersContext = Context<{ Bindings: PanelEnv; Variables: PanelVars }>

/** 口令下限。低于此值一律拒绝，管理员重置他人密码时同样适用。 */
export const MIN_PASSWORD_LENGTH = 12

const ROLES = new Set(['admin', 'maintainer'])
const MAX_PAGE_SIZE = 100

interface UserRow {
  id: number
  username: string
  email: string | null
  role: string
  blocked: number
  confirmed: number
  created_at: number
}

/** 对外用户形状；password_hash 永不出现在任何响应里。 */
function serializeUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: { type: row.role, name: row.role },
    blocked: Boolean(row.blocked),
    confirmed: Boolean(row.confirmed),
    createdAt: new Date(row.created_at).toISOString(),
  }
}

function currentUser(c: UsersContext): { id: number; role: string } | null {
  const user = c.get('panelUser') as { id: number; role: string } | undefined
  return user ?? null
}

/** 仅 admin 可进；其余一律 403，与「未登录」的 401 区分开。 */
function requireAdmin(c: UsersContext): Response | null {
  const user = currentUser(c)
  if (!user) return fail(401, 'unauthorized')
  if (user.role.trim().toLowerCase() !== 'admin') return fail(403, 'forbidden')
  return null
}

/** 未封禁的 admin 数量。用于阻止移除最后一个管理员。 */
async function activeAdminCount(db: D1Database, excludeUserId?: number): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM users
       WHERE role = 'admin' AND blocked = 0 AND (?1 IS NULL OR id != ?1)`
    )
    .bind(excludeUserId ?? null)
    .first<{ n: number }>()
  return row?.n ?? 0
}

function normalizeEmail(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  // 只做基本形状校验：唯一性交给表上的 UNIQUE 约束
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined
  return trimmed
}

// ───────────────────────── 自助 ─────────────────────────

export async function handleMeGet(c: UsersContext): Promise<Response> {
  const user = currentUser(c)
  if (!user) return fail(401, 'unauthorized')

  const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(user.id).first<UserRow>()
  if (!row) return fail(401, 'unauthorized')
  return ok(serializeUser(row))
}

/** 改自己的邮箱。用户名与角色不可自助修改。 */
export async function handleMeUpdate(c: UsersContext): Promise<Response> {
  const user = currentUser(c)
  if (!user) return fail(401, 'unauthorized')

  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return fail(400, 'invalid_request')
  }
  const payload = (body.data && typeof body.data === 'object' ? body.data : body) as Record<string, unknown>

  for (const key of Object.keys(payload)) {
    if (key !== 'email') return fail(400, `unknown_field:${key}`)
  }

  const email = normalizeEmail(payload.email)
  if (email === undefined) return fail(400, 'invalid_email')

  try {
    await c.env.DB.prepare('UPDATE users SET email = ?1 WHERE id = ?2').bind(email, user.id).run()
  } catch (error) {
    if (/UNIQUE/.test((error as Error).message || '')) return fail(400, 'email_taken')
    throw error
  }

  await recordAuditLog(c as never, {
    action: 'update',
    targetCollection: 'users',
    targetDocumentId: String(user.id),
    payloadSummary: JSON.stringify({ fields: 'email' }),
  })

  const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(user.id).first<UserRow>()
  return ok(serializeUser(row!))
}

/**
 * 改自己的密码。必须提供当前密码 —— 会话被劫持时，攻击者没有原密码就改不了口令。
 * 成功后吊销该用户的其余会话（当前会话保留），把可能已泄露的登录态一并清掉。
 */
export async function handleMePassword(c: UsersContext): Promise<Response> {
  const user = currentUser(c)
  if (!user) return fail(401, 'unauthorized')

  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return fail(400, 'invalid_request')
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  if (!currentPassword || !newPassword) return fail(400, 'invalid_request')
  if (newPassword.length < MIN_PASSWORD_LENGTH) return fail(400, 'password_too_short')
  if (newPassword === currentPassword) return fail(400, 'password_unchanged')

  const row = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?1')
    .bind(user.id)
    .first<{ password_hash: string }>()
  if (!row) return fail(401, 'unauthorized')

  if (!(await verifyPassword(currentPassword, row.password_hash))) {
    return fail(401, 'invalid_credentials')
  }

  const passwordHash = await hashPassword(newPassword)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?1 WHERE id = ?2').bind(passwordHash, user.id).run()

  // 保留当前会话，其余全部吊销。
  // sessions.id 存的是 token 的摘要，比较前必须先摘要化 —— 直接拿原始 token 比
  // 永远不相等，会把当前会话也一起删掉。
  const sessionToken = c.get('sessionToken') as string | undefined
  const currentSessionId = sessionToken ? await hashToken(sessionToken) : ''
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1 AND id != ?2')
    .bind(user.id, currentSessionId)
    .run()

  await recordAuditLog(c as never, {
    action: 'update',
    targetCollection: 'users',
    targetDocumentId: String(user.id),
    payloadSummary: JSON.stringify({ fields: 'password' }),
  })

  return ok({ success: true })
}

// ─────────────────────── 用户管理（admin） ───────────────────────

export async function handleUserList(c: UsersContext): Promise<Response> {
  const denied = requireAdmin(c)
  if (denied) return denied

  const page = Math.max(1, Number(c.req.query('page') || '1') || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(c.req.query('pageSize') || '20') || 20))

  const where: string[] = []
  const binds: unknown[] = []

  const search = c.req.query('search')?.trim()
  if (search) {
    binds.push(`%${search.toLowerCase()}%`)
    where.push(`(LOWER(username) LIKE ?${binds.length} OR LOWER(COALESCE(email, '')) LIKE ?${binds.length})`)
  }

  const status = c.req.query('status')
  if (status === 'blocked') where.push('blocked = 1')
  else if (status === 'active') where.push('blocked = 0')

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM users ${whereSql}`)
    .bind(...binds)
    .first<{ n: number }>()

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM users ${whereSql} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`
  )
    .bind(...binds)
    .all<UserRow>()

  return okPaginated(results.map(serializeUser), paginationOf(page, pageSize, totalRow?.n ?? 0))
}

export async function handleUserCreate(c: UsersContext): Promise<Response> {
  const denied = requireAdmin(c)
  if (denied) return denied

  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return fail(400, 'invalid_request')
  }
  const payload = (body.data && typeof body.data === 'object' ? body.data : body) as Record<string, unknown>

  const username = typeof payload.username === 'string' ? payload.username.trim() : ''
  const password = typeof payload.password === 'string' ? payload.password : ''
  const role = typeof payload.role === 'string' ? payload.role.trim().toLowerCase() : 'maintainer'

  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) return fail(400, 'invalid_username')
  if (password.length < MIN_PASSWORD_LENGTH) return fail(400, 'password_too_short')
  if (!ROLES.has(role)) return fail(400, 'invalid_role')

  const email = normalizeEmail(payload.email)
  if (email === undefined) return fail(400, 'invalid_email')

  const passwordHash = await hashPassword(password)
  try {
    await c.env.DB.prepare(
      `INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at)
       VALUES (?1, ?2, ?3, ?4, 0, 1, ?5)`
    )
      .bind(username, email, passwordHash, role, Date.now())
      .run()
  } catch (error) {
    if (/UNIQUE/.test((error as Error).message || '')) return fail(400, 'username_or_email_taken')
    throw error
  }

  const row = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?1').bind(username).first<UserRow>()
  await recordAuditLog(c as never, {
    action: 'create',
    targetCollection: 'users',
    targetDocumentId: String(row!.id),
    payloadSummary: JSON.stringify({ username, role }),
  })
  return ok(serializeUser(row!))
}

export async function handleUserUpdate(c: UsersContext): Promise<Response> {
  const denied = requireAdmin(c)
  if (denied) return denied
  const actor = currentUser(c)!

  const targetId = Number(c.req.param('id'))
  if (!Number.isInteger(targetId) || targetId <= 0) return fail(400, 'invalid_request')

  const target = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(targetId).first<UserRow>()
  if (!target) return fail(404, 'not_found')

  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return fail(400, 'invalid_request')
  }
  const payload = (body.data && typeof body.data === 'object' ? body.data : body) as Record<string, unknown>

  const ALLOWED = new Set(['email', 'role', 'blocked'])
  for (const key of Object.keys(payload)) {
    if (!ALLOWED.has(key)) return fail(400, `unknown_field:${key}`)
  }

  const sets: string[] = []
  const binds: unknown[] = []

  if ('email' in payload) {
    const email = normalizeEmail(payload.email)
    if (email === undefined) return fail(400, 'invalid_email')
    binds.push(email)
    sets.push(`email = ?${binds.length}`)
  }

  let nextRole = target.role
  if ('role' in payload) {
    const role = typeof payload.role === 'string' ? payload.role.trim().toLowerCase() : ''
    if (!ROLES.has(role)) return fail(400, 'invalid_role')
    // 不能给自己降级：会立刻失去管理权且可能无人可再提权
    if (targetId === actor.id && role !== 'admin') return fail(400, 'cannot_demote_self')
    nextRole = role
    binds.push(role)
    sets.push(`role = ?${binds.length}`)
  }

  let nextBlocked = target.blocked
  if ('blocked' in payload) {
    const blocked = payload.blocked === true || payload.blocked === 1 ? 1 : 0
    if (targetId === actor.id && blocked === 1) return fail(400, 'cannot_block_self')
    nextBlocked = blocked
    binds.push(blocked)
    sets.push(`blocked = ?${binds.length}`)
  }

  if (sets.length === 0) return fail(400, 'invalid_request')

  // 该用户当前是活跃 admin，而本次改动会让它不再是 → 检查是否还剩别的 admin
  const wasActiveAdmin = target.role === 'admin' && target.blocked === 0
  const staysActiveAdmin = nextRole === 'admin' && nextBlocked === 0
  if (wasActiveAdmin && !staysActiveAdmin) {
    if ((await activeAdminCount(c.env.DB, targetId)) === 0) return fail(400, 'last_admin')
  }

  binds.push(targetId)
  try {
    await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?${binds.length}`)
      .bind(...binds)
      .run()
  } catch (error) {
    if (/UNIQUE/.test((error as Error).message || '')) return fail(400, 'email_taken')
    throw error
  }

  // 封禁立即生效：清掉该用户的全部会话
  if (nextBlocked === 1) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(targetId).run()
  }

  await recordAuditLog(c as never, {
    action: 'update',
    targetCollection: 'users',
    targetDocumentId: String(targetId),
    payloadSummary: JSON.stringify({ fields: Object.keys(payload).join(',') }),
  })

  const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(targetId).first<UserRow>()
  return ok(serializeUser(row!))
}

/** 管理员重置他人密码：不需要原密码，但会吊销该用户全部会话。 */
export async function handleUserResetPassword(c: UsersContext): Promise<Response> {
  const denied = requireAdmin(c)
  if (denied) return denied

  const targetId = Number(c.req.param('id'))
  if (!Number.isInteger(targetId) || targetId <= 0) return fail(400, 'invalid_request')

  const target = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?1').bind(targetId).first<{ id: number }>()
  if (!target) return fail(404, 'not_found')

  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return fail(400, 'invalid_request')
  }

  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  if (newPassword.length < MIN_PASSWORD_LENGTH) return fail(400, 'password_too_short')

  const passwordHash = await hashPassword(newPassword)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?1 WHERE id = ?2').bind(passwordHash, targetId).run()
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(targetId).run()

  await recordAuditLog(c as never, {
    action: 'update',
    targetCollection: 'users',
    targetDocumentId: String(targetId),
    payloadSummary: JSON.stringify({ fields: 'password(reset)' }),
  })

  return ok({ success: true })
}

export async function handleUserDelete(c: UsersContext): Promise<Response> {
  const denied = requireAdmin(c)
  if (denied) return denied
  const actor = currentUser(c)!

  const targetId = Number(c.req.param('id'))
  if (!Number.isInteger(targetId) || targetId <= 0) return fail(400, 'invalid_request')
  if (targetId === actor.id) return fail(400, 'cannot_delete_self')

  const target = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(targetId).first<UserRow>()
  if (!target) return fail(404, 'not_found')

  if (target.role === 'admin' && target.blocked === 0) {
    if ((await activeAdminCount(c.env.DB, targetId)) === 0) return fail(400, 'last_admin')
  }

  // sessions.user_id 有 ON DELETE CASCADE，会话随之清理
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(targetId).run()

  await recordAuditLog(c as never, {
    action: 'delete',
    targetCollection: 'users',
    targetDocumentId: String(targetId),
    payloadSummary: JSON.stringify({ username: target.username }),
  })

  return ok({ success: true })
}
