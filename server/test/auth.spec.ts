/**
 * 认证域测试：密码哈希往返 + 会话过期 + bootstrap 幂等。
 * 基线 schema 由 test/baseline.ts（node 环境预读）注入。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'

import { BASELINE_STATEMENTS } from './baseline'
import { hashPassword, verifyPassword } from '../src/auth/password'
import { createSession, getSessionUser, deleteSession, pruneExpiredSessions, SESSION_TTL_SECONDS } from '../src/auth/session'
import { ensureBootstrapAdmin } from '../src/auth/bootstrap'
import { isAllowedAdminUser, getAllowedRoles } from '../src/auth/roles'

async function seedUser(username: string, role = 'maintainer', blocked = 0): Promise<number> {
  const passwordHash = await hashPassword('test-password-123')
  const result = await env.DB.prepare(
    'INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)'
  )
    .bind(username, `${username}@example.com`, passwordHash, role, blocked, Date.now())
    .run()
  return result.meta.last_row_id as number
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
})

describe('password hashing (PBKDF2 WebCrypto)', () => {
  it('round-trips: verifyPassword(hash(pw), pw) === true', async () => {
    const hash = await hashPassword('S3cret-pass!')
    expect(await verifyPassword('S3cret-pass!', hash)).toBe(true)
  })

  it('rejects wrong password and malformed hashes', async () => {
    const hash = await hashPassword('correct-horse')
    expect(await verifyPassword('wrong-battery', hash)).toBe(false)
    expect(await verifyPassword('', '')).toBe(false)
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false)
    // 迭代数低于 100000 的伪造哈希拒绝
    expect(await verifyPassword('x', '$pbkdf2$1000$AAAA$AAAA')).toBe(false)
  })

  it('produces $pbkdf2$ format with iter>=100000 and unique salts', async () => {
    const a = await hashPassword('same-password')
    const b = await hashPassword('same-password')
    expect(a.startsWith('$pbkdf2$')).toBe(true)
    expect(b.startsWith('$pbkdf2$')).toBe(true)
    const iterA = Number(a.split('$')[2])
    expect(iterA).toBeGreaterThanOrEqual(100000)
    // 相同密码不同盐 → 不同哈希
    expect(a).not.toBe(b)
  })
})

describe('sessions (D1-backed, fail-closed)', () => {
  it('creates and resolves a session; unknown token rejected', async () => {
    const userId = await seedUser(`session-user-${Date.now()}`)
    const token = await createSession(env.DB, userId)

    const user = await getSessionUser(env.DB, token)
    expect(user).not.toBeNull()
    expect(user!.username).toContain('session-user')

    expect(await getSessionUser(env.DB, 'deadbeef'.repeat(8))).toBeNull()
    expect(await getSessionUser(env.DB, undefined)).toBeNull()
    // 格式不对的 token 直接拒绝
    expect(await getSessionUser(env.DB, "'; DROP TABLE sessions; --")).toBeNull()
  })

  it('expires sessions after TTL (expiry check is <= now)', async () => {
    const userId = await seedUser(`expired-user-${Date.now()}`)
    const token = await createSession(env.DB, userId, Date.now() - SESSION_TTL_SECONDS * 1000 - 5)

    // 过期会话：查表判定过期 → 删行 + 返回 null
    const user = await getSessionUser(env.DB, token)
    expect(user).toBeNull()

    const remaining = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?1').bind(token).first<{ n: number }>()
    expect(remaining!.n).toBe(0)
  })

  it('revokes immediately when the session row is deleted', async () => {
    const userId = await seedUser(`revoke-user-${Date.now()}`)
    const token = await createSession(env.DB, userId)
    expect(await getSessionUser(env.DB, token)).not.toBeNull()

    await deleteSession(env.DB, token)
    expect(await getSessionUser(env.DB, token)).toBeNull()
  })

  it('pruneExpiredSessions removes only expired rows', async () => {
    const now = Date.now()
    const u1 = await seedUser(`prune-a-${now}`)
    const u2 = await seedUser(`prune-b-${now}`)

    const stale = await createSession(env.DB, u1, now - 1000 - SESSION_TTL_SECONDS * 1000)
    const fresh = await createSession(env.DB, u2, now)

    await pruneExpiredSessions(env.DB, now)
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?1').bind(stale).first<{ n: number }>()).toMatchObject({ n: 0 })
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?1').bind(fresh).first<{ n: number }>()).toMatchObject({ n: 1 })
  })

  it('refuses sessions of blocked users', async () => {
    const userId = await seedUser(`blocked-user-${Date.now()}`, 'maintainer', 1)
    const token = await createSession(env.DB, userId)
    expect(await getSessionUser(env.DB, token)).toBeNull()
  })
})

describe('bootstrap admin (idempotent)', () => {
  it('creates maintainer only when users table is empty', async () => {
    const countBefore = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>()
    if ((countBefore?.n ?? 0) > 0) return

    await ensureBootstrapAdmin(env.DB, 'boot-admin', 'boot-secret-9', Date.now())
    const created = await env.DB.prepare("SELECT * FROM users WHERE username = 'boot-admin'").first<{ role: string }>()
    expect(created).not.toBeNull()
    expect(created!.role).toBe('maintainer')

    // users 表非空时再次调用不新增
    await ensureBootstrapAdmin(env.DB, 'boot-admin-2', 'x', Date.now())
    const countAfter = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>()
    expect(countAfter!.n).toBe((countBefore?.n ?? 0) + 1)
  })

  it('no-ops without env vars', async () => {
    const before = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>()
    await ensureBootstrapAdmin(env.DB, undefined, undefined)
    await ensureBootstrapAdmin(env.DB, 'only-user', undefined)
    await ensureBootstrapAdmin(env.DB, undefined, 'only-pass')
    const after = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>()
    expect(after!.n).toBe(before!.n)
  })
})

describe('role allow-list', () => {
  it('production default denies all; dev default allows maintainer/admin', () => {
    expect(Object.keys(getAllowedRoles(undefined, true))).toHaveLength(0)
    expect(getAllowedRoles(undefined, false)['maintainer']).toBe(true)
    expect(isAllowedAdminUser({ role: 'maintainer' }, undefined, false)).toBe(true)
    expect(isAllowedAdminUser({ role: 'authenticated' }, undefined, false)).toBe(false)
    expect(isAllowedAdminUser({ role: 'editor' }, 'editor,maintainer', true)).toBe(true)
    expect(isAllowedAdminUser({ role: 'editor', blocked: 1 }, 'editor', true)).toBe(false)
  })
})
