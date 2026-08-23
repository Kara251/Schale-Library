/**
 * 契约兼容层测试：frontend/tests/contracts 冻结快照里前端实际调用、
 * 而 /panel 原生路由没有覆盖的端点。
 * - POST /api/auth/local          → { jwt } （ADMIN_AUTH_CONTRACT.login）
 * - GET  /api/users/me            → 不包装的 user（ADMIN_AUTH_CONTRACT.fetchStrapiCurrentUser）
 * - POST /api/panel/internal/rate-limit → { allowed }（RATE_LIMIT_CONTRACT）
 * - Bearer 与 cookie 两种会话传输等价
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { hashPassword } from '../src/auth/password'
import app from '../src/index'

const CREDS = { identifier: 'compat-admin', password: 'compat-pass-12345' }

/**
 * 每个请求换一个 IP：登录端点带 IP 维度限流（30 次 / 10min），
 * 且全部 spec 共享同一 D1，复用 IP 会跨文件互相打满配额。
 * 198.18/15 是基准测试保留段，其他 spec 没用到。
 */
let ipCounter = 0
function nextIp(): string {
  ipCounter += 1
  return `198.18.${Math.floor(ipCounter / 250) % 250}.${ipCounter % 250}`
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return app.request(
    `https://test.local${path}`,
    {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': nextIp(),
        ...(init?.headers ?? {}),
      },
    },
    env
  )
}

async function loginForJwt(): Promise<string> {
  const res = await request('/api/auth/local', {
    method: 'POST',
    body: JSON.stringify(CREDS),
  })
  expect(res.status).toBe(200)
  const body = (await res.json()) as { jwt?: string }
  expect(typeof body.jwt).toBe('string')
  return body.jwt!
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
  const passwordHash = await hashPassword(CREDS.password)
  await env.DB.prepare(
    "INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, 'compat@example.com', ?2, 'maintainer', 0, 1, ?3)"
  )
    .bind(CREDS.identifier, passwordHash, Date.now())
    .run()
})

describe('POST /api/auth/local（Strapi 兼容登录）', () => {
  it('返回 jwt 与展开 role 的 user', async () => {
    const res = await request('/api/auth/local', {
      method: 'POST',
      body: JSON.stringify(CREDS),
    })
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      jwt: string
      user: { id: number; username: string; blocked: boolean; role: { type: string; name: string } }
    }
    expect(body.jwt.length).toBeGreaterThan(0)
    expect(body.user.username).toBe(CREDS.identifier)
    expect(body.user.blocked).toBe(false)
    // 前端 isAllowedAdminUser 读 role.type / role.name 两个字段
    expect(body.user.role.type).toBe('maintainer')
    expect(body.user.role.name).toBe('maintainer')
  })

  it('错误口令 → 401 invalid_credentials，且不发 jwt', async () => {
    const res = await request('/api/auth/local', {
      method: 'POST',
      body: JSON.stringify({ identifier: CREDS.identifier, password: 'wrong-password' }),
    })
    expect(res.status).toBe(401)
    expect(await res.text()).not.toContain('jwt')
  })
})

describe('GET /api/users/me（Bearer）', () => {
  it('用 /auth/local 拿到的 jwt 可直接换当前用户，响应不加 data 包装', async () => {
    const jwt = await loginForJwt()
    const res = await request('/api/users/me?populate=role', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    expect(res.status).toBe(200)

    const user = (await res.json()) as Record<string, unknown>
    // 契约：前端把响应体整个当 AdminUser 用，顶层必须就是 user
    expect(user.username).toBe(CREDS.identifier)
    expect(user.data).toBeUndefined()
    expect((user.role as { type: string }).type).toBe('maintainer')
  })

  it('无 token → 401；伪造 token → 401', async () => {
    expect((await request('/api/users/me')).status).toBe(401)
    const forged = await request('/api/users/me', {
      headers: { Authorization: 'Bearer not-a-real-session-token' },
    })
    expect(forged.status).toBe(401)
  })
})

describe('Bearer 与 cookie 会话等价', () => {
  it('同一 token 经 Authorization 头也能过 /panel/* 会话校验', async () => {
    const jwt = await loginForJwt()
    const res = await request('/api/panel/announcements?page=1&pageSize=1', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    expect(res.status).toBe(200)
  })

  it('登出后同一 Bearer token 立即失效', async () => {
    const jwt = await loginForJwt()
    const logout = await request('/api/panel/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
    })
    expect(logout.status).toBe(200)

    const after = await request('/api/panel/announcements?page=1&pageSize=1', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    expect(after.status).toBe(401)
  })
})

describe('POST /api/panel/internal/rate-limit', () => {
  it('窗口内超出 limit 后 allowed 转 false', async () => {
    const identifier = `compat-${Date.now()}`
    const body = JSON.stringify({ scope: 'compat-test', identifier, limit: 2, windowMs: 60_000 })

    const first = (await (await request('/api/panel/internal/rate-limit', { method: 'POST', body })).json()) as { allowed: boolean }
    const second = (await (await request('/api/panel/internal/rate-limit', { method: 'POST', body })).json()) as { allowed: boolean }
    const third = (await (await request('/api/panel/internal/rate-limit', { method: 'POST', body })).json()) as { allowed: boolean }

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
    expect(third.allowed).toBe(false)
  })

  it('无需会话即可调用（前端在登录前就要用它限流）', async () => {
    const res = await request('/api/panel/internal/rate-limit', {
      method: 'POST',
      body: JSON.stringify({ scope: 'compat-anon', identifier: 'x', limit: 5, windowMs: 60_000 }),
    })
    expect(res.status).toBe(200)
  })

  it('缺字段或字段类型不对 → 400', async () => {
    const missing = await request('/api/panel/internal/rate-limit', {
      method: 'POST',
      body: JSON.stringify({ scope: 'compat-bad', identifier: 'x' }),
    })
    expect(missing.status).toBe(400)

    const wrongType = await request('/api/panel/internal/rate-limit', {
      method: 'POST',
      body: JSON.stringify({ scope: 'compat-bad', identifier: 'x', limit: '5', windowMs: 60_000 }),
    })
    expect(wrongType.status).toBe(400)
  })
})

describe('GET /api/panel/system/health', () => {
  it('契约路径可达（旧的 /panel/system-health 别名保留）', async () => {
    const jwt = await loginForJwt()
    const headers = { Authorization: `Bearer ${jwt}` }

    const contractPath = await request('/api/panel/system/health', { headers })
    const legacyPath = await request('/api/panel/system-health', { headers })
    expect(contractPath.status).toBe(200)
    expect(legacyPath.status).toBe(200)
  })
})
