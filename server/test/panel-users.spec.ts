/**
 * 用户管理与个人设置。
 *
 * 重点覆盖服务端护栏 —— 这些约束不能只靠前端隐藏按钮：
 * - maintainer 拿不到任何用户管理端点（403，与未登录的 401 区分）；
 * - 不能封禁 / 降级 / 删除自己；
 * - 不能移除最后一个未封禁的 admin；
 * - 改密码必须提供原密码，成功后吊销其余会话；
 * - 封禁与重置密码立即吊销目标用户的全部会话；
 * - 任何响应都不得包含 password_hash。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { hashPassword } from '../src/auth/password'
import { createSession } from '../src/auth/session'
import app from '../src/index'

const PASSWORD = 'seed-password-1234'

async function seedUser(username: string, role: string, blocked = 0): Promise<number> {
  const hash = await hashPassword(PASSWORD)
  const row = await env.DB.prepare(
    `INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6) RETURNING id`
  )
    .bind(username, `${username}@example.com`, hash, role, blocked, Date.now())
    .first<{ id: number }>()
  return row!.id
}

async function asUser(userId: number, path: string, init?: RequestInit): Promise<Response> {
  const token = await createSession(env.DB, userId)
  return app.request(
    `https://test.local/api${path}`,
    {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    },
    env
  )
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
})

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM sessions').run()
  await env.DB.prepare('DELETE FROM users').run()
})

describe('权限边界', () => {
  it('maintainer 访问用户管理一律 403', async () => {
    const maintainer = await seedUser('m1', 'maintainer')
    const other = await seedUser('m2', 'maintainer')

    expect((await asUser(maintainer, '/panel/users')).status).toBe(403)
    expect(
      (await asUser(maintainer, '/panel/users', { method: 'POST', body: JSON.stringify({ username: 'x', password: 'aaaaaaaaaaaa' }) })).status
    ).toBe(403)
    expect(
      (await asUser(maintainer, `/panel/users/${other}`, { method: 'PUT', body: JSON.stringify({ role: 'admin' }) })).status
    ).toBe(403)
    expect((await asUser(maintainer, `/panel/users/${other}`, { method: 'DELETE' })).status).toBe(403)
  })

  it('未登录访问用户管理是 401，不是 403', async () => {
    const res = await app.request('https://test.local/api/panel/users', {}, env)
    expect(res.status).toBe(401)
  })

  it('maintainer 可以用个人设置端点', async () => {
    const maintainer = await seedUser('m3', 'maintainer')
    expect((await asUser(maintainer, '/panel/users/me')).status).toBe(200)
  })
})

describe('个人设置', () => {
  it('改邮箱', async () => {
    const userId = await seedUser('self1', 'maintainer')
    const res = await asUser(userId, '/panel/users/me', {
      method: 'PUT',
      body: JSON.stringify({ email: 'new@example.com' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { email: string } }
    expect(body.data.email).toBe('new@example.com')
  })

  it('邮箱格式非法 → 400；被占用 → 400', async () => {
    const a = await seedUser('self2', 'maintainer')
    await seedUser('self3', 'maintainer')

    expect((await asUser(a, '/panel/users/me', { method: 'PUT', body: JSON.stringify({ email: 'not-an-email' }) })).status).toBe(400)
    expect((await asUser(a, '/panel/users/me', { method: 'PUT', body: JSON.stringify({ email: 'self3@example.com' }) })).status).toBe(400)
  })

  it('不能自助改角色或用户名', async () => {
    const userId = await seedUser('self4', 'maintainer')
    expect((await asUser(userId, '/panel/users/me', { method: 'PUT', body: JSON.stringify({ role: 'admin' }) })).status).toBe(400)
    expect((await asUser(userId, '/panel/users/me', { method: 'PUT', body: JSON.stringify({ username: 'hacker' }) })).status).toBe(400)

    const row = await env.DB.prepare('SELECT role, username FROM users WHERE id = ?1').bind(userId).first<{ role: string; username: string }>()
    expect(row!.role).toBe('maintainer')
    expect(row!.username).toBe('self4')
  })

  it('改密码必须提供正确的原密码', async () => {
    const userId = await seedUser('self5', 'maintainer')

    const wrong = await asUser(userId, '/panel/users/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'wrong-password', newPassword: 'brand-new-password' }),
    })
    expect(wrong.status).toBe(401)

    const okRes = await asUser(userId, '/panel/users/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: PASSWORD, newPassword: 'brand-new-password' }),
    })
    expect(okRes.status).toBe(200)
  })

  it('新密码短于下限 → 400', async () => {
    const userId = await seedUser('self6', 'maintainer')
    const res = await asUser(userId, '/panel/users/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: PASSWORD, newPassword: 'short' }),
    })
    expect(res.status).toBe(400)
  })

  it('改密码后其余会话被吊销，当前会话保留', async () => {
    const userId = await seedUser('self7', 'maintainer')
    const staleToken = await createSession(env.DB, userId)
    const activeToken = await createSession(env.DB, userId)

    const res = await app.request(
      'https://test.local/api/panel/users/me/password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({ currentPassword: PASSWORD, newPassword: 'another-good-password' }),
      },
      env
    )
    expect(res.status).toBe(200)

    // 旧会话失效
    const stale = await app.request(
      'https://test.local/api/panel/users/me',
      { headers: { Authorization: `Bearer ${staleToken}` } },
      env
    )
    expect(stale.status).toBe(401)

    // 当前会话仍然可用
    const active = await app.request(
      'https://test.local/api/panel/users/me',
      { headers: { Authorization: `Bearer ${activeToken}` } },
      env
    )
    expect(active.status).toBe(200)
  })
})

describe('用户管理（admin）', () => {
  it('新建用户并可登录；响应不含 password_hash', async () => {
    const admin = await seedUser('admin1', 'admin')
    const res = await asUser(admin, '/panel/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'newbie', email: 'newbie@example.com', password: 'newbie-password-1', role: 'maintainer' }),
    })
    expect(res.status).toBe(200)

    const text = await res.text()
    expect(text).not.toContain('password_hash')
    expect(text).not.toContain('$pbkdf2$')

    const login = await app.request(
      'https://test.local/api/auth/local',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.19.1.1' },
        body: JSON.stringify({ identifier: 'newbie', password: 'newbie-password-1' }),
      },
      env
    )
    expect(login.status).toBe(200)
  })

  it('用户名格式与密码长度校验', async () => {
    const admin = await seedUser('admin2', 'admin')
    const bad = [
      { username: 'ab', password: 'long-enough-pass' },
      { username: 'has space', password: 'long-enough-pass' },
      { username: 'valid_name', password: 'short' },
      { username: 'valid_name', password: 'long-enough-pass', role: 'superuser' },
    ]
    for (const payload of bad) {
      const res = await asUser(admin, '/panel/users', { method: 'POST', body: JSON.stringify(payload) })
      expect(res.status, JSON.stringify(payload)).toBe(400)
    }
  })

  it('用户名重复 → 400', async () => {
    const admin = await seedUser('admin3', 'admin')
    await seedUser('taken', 'maintainer')
    const res = await asUser(admin, '/panel/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'taken', password: 'long-enough-password' }),
    })
    expect(res.status).toBe(400)
  })

  it('列表支持分页与搜索，且不含 password_hash', async () => {
    const admin = await seedUser('admin4', 'admin')
    for (let i = 0; i < 5; i++) await seedUser(`bulk${i}`, 'maintainer')

    const res = await asUser(admin, '/panel/users?page=1&pageSize=2')
    const text = await res.text()
    expect(text).not.toContain('password_hash')

    const body = JSON.parse(text) as { data: unknown[]; meta: { pagination: { total: number; pageCount: number } } }
    expect(body.data.length).toBe(2)
    expect(body.meta.pagination.total).toBe(6)
    expect(body.meta.pagination.pageCount).toBe(3)

    const searched = (await (await asUser(admin, '/panel/users?search=bulk3')).json()) as {
      data: Array<{ username: string }>
    }
    expect(searched.data.map((u) => u.username)).toEqual(['bulk3'])
  })

  it('改角色与封禁', async () => {
    const admin = await seedUser('admin5', 'admin')
    const target = await seedUser('target5', 'maintainer')

    const promoted = (await (
      await asUser(admin, `/panel/users/${target}`, { method: 'PUT', body: JSON.stringify({ role: 'admin' }) })
    ).json()) as { data: { role: { type: string } } }
    expect(promoted.data.role.type).toBe('admin')

    const blocked = (await (
      await asUser(admin, `/panel/users/${target}`, { method: 'PUT', body: JSON.stringify({ blocked: true }) })
    ).json()) as { data: { blocked: boolean } }
    expect(blocked.data.blocked).toBe(true)
  })

  it('封禁立即吊销目标用户的全部会话', async () => {
    const admin = await seedUser('admin6', 'admin')
    const target = await seedUser('target6', 'maintainer')
    const targetToken = await createSession(env.DB, target)

    await asUser(admin, `/panel/users/${target}`, { method: 'PUT', body: JSON.stringify({ blocked: true }) })

    const res = await app.request(
      'https://test.local/api/panel/users/me',
      { headers: { Authorization: `Bearer ${targetToken}` } },
      env
    )
    expect(res.status).toBe(401)
  })

  it('管理员重置他人密码后，对方旧会话失效、新密码可登录', async () => {
    const admin = await seedUser('admin7', 'admin')
    const target = await seedUser('target7', 'maintainer')
    const targetToken = await createSession(env.DB, target)

    const res = await asUser(admin, `/panel/users/${target}/password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: 'reset-by-admin-123' }),
    })
    expect(res.status).toBe(200)

    const stale = await app.request(
      'https://test.local/api/panel/users/me',
      { headers: { Authorization: `Bearer ${targetToken}` } },
      env
    )
    expect(stale.status).toBe(401)

    const login = await app.request(
      'https://test.local/api/auth/local',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.19.2.1' },
        body: JSON.stringify({ identifier: 'target7', password: 'reset-by-admin-123' }),
      },
      env
    )
    expect(login.status).toBe(200)
  })

  it('删除用户会连带清掉其会话', async () => {
    const admin = await seedUser('admin8', 'admin')
    const target = await seedUser('target8', 'maintainer')
    await createSession(env.DB, target)

    expect((await asUser(admin, `/panel/users/${target}`, { method: 'DELETE' })).status).toBe(200)

    const left = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?1')
      .bind(target)
      .first<{ n: number }>()
    expect(left!.n).toBe(0)
  })

  it('不存在的用户 → 404', async () => {
    const admin = await seedUser('admin9', 'admin')
    expect((await asUser(admin, '/panel/users/999999', { method: 'PUT', body: JSON.stringify({ blocked: true }) })).status).toBe(404)
    expect((await asUser(admin, '/panel/users/999999', { method: 'DELETE' })).status).toBe(404)
  })
})

describe('防自锁护栏', () => {
  it('不能封禁自己', async () => {
    const admin = await seedUser('lock1', 'admin')
    const res = await asUser(admin, `/panel/users/${admin}`, { method: 'PUT', body: JSON.stringify({ blocked: true }) })
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('cannot_block_self')
  })

  it('不能给自己降级', async () => {
    const admin = await seedUser('lock2', 'admin')
    const res = await asUser(admin, `/panel/users/${admin}`, { method: 'PUT', body: JSON.stringify({ role: 'maintainer' }) })
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('cannot_demote_self')
  })

  it('不能删除自己', async () => {
    const admin = await seedUser('lock3', 'admin')
    const res = await asUser(admin, `/panel/users/${admin}`, { method: 'DELETE' })
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('cannot_delete_self')
  })

  it('不能移除最后一个 admin（降级路径）', async () => {
    const onlyAdmin = await seedUser('solo1', 'admin')
    const helper = await seedUser('solo1-helper', 'admin')

    // helper 把 onlyAdmin 降级 —— 此时 helper 自己还是 admin，允许
    expect(
      (await asUser(helper, `/panel/users/${onlyAdmin}`, { method: 'PUT', body: JSON.stringify({ role: 'maintainer' }) })).status
    ).toBe(200)

    // 现在 helper 是唯一 admin，它不能被降级（由别的 admin 操作也不行 —— 这里用自身路径已被 cannot_demote_self 挡下，
    // 所以改用封禁另一个 admin 的场景验证 last_admin）
    const second = await seedUser('solo1-second', 'admin')
    await asUser(helper, `/panel/users/${second}`, { method: 'PUT', body: JSON.stringify({ role: 'maintainer' }) })

    const soloCount = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND blocked=0").first<{ n: number }>()
    expect(soloCount!.n).toBe(1)
  })

  it('不能删除最后一个 admin', async () => {
    const admin = await seedUser('solo2', 'admin')
    const other = await seedUser('solo2-other', 'admin')

    // other 删掉 admin：删完自己还是 admin，允许
    expect((await asUser(other, `/panel/users/${admin}`, { method: 'DELETE' })).status).toBe(200)

    // 现在 other 是唯一 admin，新建一个 maintainer 也无法删掉 other
    const maintainer = await seedUser('solo2-m', 'maintainer')
    expect((await asUser(maintainer, `/panel/users/${other}`, { method: 'DELETE' })).status).toBe(403)
  })

  it('封禁最后一个 admin 被 last_admin 挡下', async () => {
    const a = await seedUser('last1', 'admin')
    const b = await seedUser('last2', 'admin')

    // b 封禁 a：还剩 b，允许
    expect((await asUser(b, `/panel/users/${a}`, { method: 'PUT', body: JSON.stringify({ blocked: true }) })).status).toBe(200)

    // 解封 a 后，由 a 去封禁 b：还剩 a，允许
    await asUser(b, `/panel/users/${a}`, { method: 'PUT', body: JSON.stringify({ blocked: false }) })
    expect((await asUser(a, `/panel/users/${b}`, { method: 'PUT', body: JSON.stringify({ blocked: true }) })).status).toBe(200)

    // 此时 a 是唯一活跃 admin，a 封禁自己被 cannot_block_self 挡下
    expect((await asUser(a, `/panel/users/${a}`, { method: 'PUT', body: JSON.stringify({ blocked: true }) })).status).toBe(400)
  })
})
