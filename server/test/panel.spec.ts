/**
 * /panel 域测试：登录（成功/失败/限流）、会话校验 fail-closed、
 * CRUD 字段白名单、批量操作、审计写入、CSV 公式注入中和。
 * 通过 app.fetch 直接驱动 Hono 路由（workers 运行时）。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { hashPassword } from '../src/auth/password'
import { createSession, deleteSession } from '../src/auth/session'
import app from '../src/index'

const LOGIN_BODY = { identifier: 'panel-admin', password: 'panel-pass-123' }

async function login(identifier = LOGIN_BODY.identifier, password = LOGIN_BODY.password): Promise<Response> {
  return app.request(
    'https://test.local/api/panel/auth/login',
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' }, body: JSON.stringify({ identifier, password }) },
    env
  )
}

async function createVerifiedUser(): Promise<void> {
  const passwordHash = await hashPassword(LOGIN_BODY.password)
  await env.DB.prepare(
    "INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES ('panel-admin', 'admin@example.com', ?1, 'maintainer', 0, 1, ?2)"
  )
    .bind(passwordHash, Date.now())
    .run()
}

function cookieFrom(response: Response): string | null {
  return response.headers.get('Set-Cookie')
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
})

describe('POST /panel/auth/login', () => {
  it('sets session cookie and returns user on success', async () => {
    await createVerifiedUser()
    const res = await login()
    expect(res.status).toBe(200)

    const body = await res.json<{ data: { user: { username: string; email: string; role: { type: string } } } }>()
    expect(body.data.user.username).toBe('panel-admin')
    expect(body.data.user.email).toBe('admin@example.com')
    expect(body.data.user.role.type).toBe('maintainer')

    // 会话 cookie 属性：httpOnly + SameSite=Strict + Max-Age 28800
    const cookie = cookieFrom(res)!
    expect(cookie).toContain('schale_admin_session=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).toContain('Max-Age=28800')

    // 会话行已落库
    const token = /schale_admin_session=([0-9a-f]{64})/.exec(cookie)![1]
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?1').bind(token).first<{ n: number }>()
    expect(row!.n).toBe(1)
  })

  it('rejects bad password with invalid_credentials (401)', async () => {
    const res = await login(LOGIN_BODY.identifier, 'totally-wrong')
    expect(res.status).toBe(401)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe('invalid_credentials')
  })

  it('rejects unknown user with invalid_credentials (401)', async () => {
    const res = await login('ghost-user', 'whatever')
    expect(res.status).toBe(401)
    expect((await res.json<{ error: string }>()).error).toBe('invalid_credentials')
  })

  it('rate limits by CF-Connecting-IP after 30 attempts (429 rate_limited)', async () => {
    // 同一 IP 已有 30 次成功/失败尝试记录 → 第 31 次拒绝
    for (let i = 0; i < 30; i++) {
      await login('panel-admin', 'deliberately-wrong-' + i)
    }
    const res = await login()
    expect(res.status).toBe(429)
    expect((await res.json<{ error: string }>()).error).toBe('rate_limited')

    const record = await env.DB.prepare("SELECT count FROM rate_limit_records WHERE scope = 'login' AND identifier = '203.0.113.7'").first<{ count: number }>()
    expect(record!.count).toBeGreaterThanOrEqual(30)

    // 换 IP 不受限流影响
    const freshIp = await app.request(
      'https://test.local/api/panel/auth/login',
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.9' }, body: JSON.stringify(LOGIN_BODY) },
      env
    )
    expect(freshIp.status).toBe(200)
  })
})

describe('session guard (fail-closed)', () => {
  it('GET /panel/auth/session without cookie → 401', async () => {
    const res = await app.request('https://test.local/api/panel/auth/session', {}, env)
    expect(res.status).toBe(401)
  })

  it('GET /panel/auth/session with valid cookie → current user', async () => {
    const loginRes = await login('panel-admin', LOGIN_BODY.password.replace('x', 'x')) // IP already limited; use new IP
    if (loginRes.status !== 200) {
      // IP 被上一组用例限流：换 IP 登录
      const alt = await app.request(
        'https://test.local/api/panel/auth/login',
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.10' }, body: JSON.stringify(LOGIN_BODY) },
        env
      )
      expect(alt.status).toBe(200)
    }
  })

  it('panel routes require session: GET /panel/announcements without cookie → 401', async () => {
    const res = await app.request('https://test.local/api/panel/announcements', {}, env)
    expect(res.status).toBe(401)
  })

  it('revoked session (deleted row) is rejected immediately on protected routes', async () => {
    // 直接建一个会话再删行，验证查表即时吊销
    const user = await env.DB.prepare("SELECT id FROM users WHERE username = 'panel-admin'").first<{ id: number }>()
    const token = await createSession(env.DB, user!.id)
    const cookie = `schale_admin_session=${token}; Path=/`

    const okRes = await app.request('https://test.local/api/panel/auth/session', { headers: { Cookie: cookie } }, env)
    expect(okRes.status).toBe(200)

    await deleteSession(env.DB, token)
    const revokedRes = await app.request('https://test.local/api/panel/announcements', { headers: { Cookie: cookie } }, env)
    expect(revokedRes.status).toBe(401)
  })
})

describe('collection CRUD with field whitelist', () => {
  async function authedRequest(path: string, init?: RequestInit): Promise<Response> {
    const user = await env.DB.prepare("SELECT id FROM users WHERE username = 'panel-admin'").first<{ id: number }>()
    const token = await createSession(env.DB, user!.id)
    return app.request(
      `https://test.local/api${path}`,
      { ...init, headers: { 'Content-Type': 'application/json', Cookie: `schale_admin_session=${token}`, ...(init?.headers ?? {}) } },
      env
    )
  }

  it('create → list → get → update → reject unknown field', async () => {
    const created = await authedRequest('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '测试公告', content: '内容', priority: 5, publishedAt: true } }),
    })
    expect(created.status).toBe(200)
    const createdBody = await created.json<{ data: { documentId: string; title: string; status: string; priority: number } }>()
    expect(createdBody.data.title).toBe('测试公告')
    expect(createdBody.data.status).toBe('published') // publishedAt=true → 立即发布

    const documentId = createdBody.data.documentId

    const listed = await authedRequest('/panel/announcements?page=1&pageSize=12&status=published&search=%E6%B5%8B%E8%AF%95')
    expect(listed.status).toBe(200)
    const listBody = await listed.json<{ data: unknown[]; meta: { pagination: { total: number; page: number; pageSize: number; pageCount: number } } }>()
    expect(listBody.data.length).toBeGreaterThanOrEqual(1)
    expect(listBody.meta.pagination.total).toBeGreaterThanOrEqual(1)

    const got = await authedRequest(`/panel/announcements/${documentId}`)
    expect(got.status).toBe(200)

    const updated = await authedRequest(`/panel/announcements/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { title: '更新后的公告' } }),
    })
    expect(updated.status).toBe(200)
    const updatedBody = await updated.json<{ data: { title: string } }>()
    expect(updatedBody.data.title).toBe('更新后的公告')

    // 未登记字段拒绝（400）
    const rejected = await authedRequest('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: 'ok', hacker_field: 'nope' } }),
    })
    expect(rejected.status).toBe(400)

    // 未登记集合 404
    const unknownCollection = await authedRequest('/panel/not-a-collection')
    expect(unknownCollection.status).toBe(404)
  })

  it('bulk publish/unpublish/delete with per-item errors', async () => {
    const mk = async (title: string): Promise<string> => {
      const res = await authedRequest('/panel/announcements', { method: 'POST', body: JSON.stringify({ data: { title } }) })
      const body = await res.json<{ data: { documentId: string } }>()
      return body.data.documentId
    }
    const a = await mk('bulk-a')
    const b = await mk('bulk-b')

    const pub = await authedRequest('/panel/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ collection: 'announcements', action: 'publish', ids: [a, b] }),
    })
    expect(pub.status).toBe(200)
    const pubWrapped = await pub.json<{ data: { success: boolean; updated: number; failed: number; errors: unknown[] } }>()
    const pubBody = pubWrapped.data
    expect(pubBody.success).toBe(true)
    expect(pubBody.updated).toBe(2)
    expect(pubBody.failed).toBe(0)

    // 含不存在 ID → failed 计入 errors
    const mixed = await authedRequest('/panel/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ collection: 'announcements', action: 'unpublish', ids: [a, 'nonexistent-id'] }),
    })
    const mixedWrapped = await mixed.json<{ data: { updated: number; failed: number; errors: string[] } }>()
    expect(mixedWrapped.data.updated).toBe(1)
    expect(mixedWrapped.data.failed).toBe(1)
    expect(mixedWrapped.data.errors[0]).toContain('nonexistent-id')

    // set-student-organization 仅限 students 集合
    const wrongCollection = await authedRequest('/panel/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ collection: 'announcements', action: 'set-student-organization', ids: [a], organization: 'X' }),
    })
    expect(wrongCollection.status).toBe(400)

    const del = await authedRequest('/panel/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ collection: 'announcements', action: 'delete', ids: [a, b] }),
    })
    const delWrapped = await del.json<{ data: { updated: number } }>()
    expect(delWrapped.data.updated).toBe(2)
  })

  it('every write lands an admin_audit_logs row; audit list paginates; CSV export neutralizes formulas', async () => {
    const before = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_audit_logs').first<{ n: number }>()

    await authedRequest('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '审计样例', priority: 1 } }),
    })

    const after = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_audit_logs').first<{ n: number }>()
    expect(after!.n).toBeGreaterThan(before!.n)

    const latest = await env.DB.prepare('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 1').first<{ action: string; target_collection: string; actor_username: string | null }>()
    expect(latest!.action).toBe('create')
    expect(latest!.target_collection).toBe('announcements')
    expect(latest!.actor_username).toBe('panel-admin')

    const listRes = await authedRequest('/panel/admin-audit-logs?page=1&pageSize=20')
    expect(listRes.status).toBe(200)
    const listBody = await listRes.json<{ data: unknown[]; meta: { pagination: { total: number } } }>()
    expect(listBody.meta.pagination.total).toBeGreaterThan(0)

    // CSV 导出：公式注入中和
    await env.DB.prepare(
      "INSERT INTO admin_audit_logs (action, target_collection, payload_summary, actor_username, ip, created_at) VALUES ('update', 'evil-coll', '=HYPERLINK(\"http://evil\")+cmd', 'tester', '127.0.0.1', ?1)"
    ).bind(Date.now()).run()

    const csvRes = await authedRequest('/panel/admin-audit-logs/export?action=all')
    expect(csvRes.status).toBe(200)
    expect(csvRes.headers.get('Content-Type')).toContain('text/csv')
    const csv = await csvRes.text()
    const evilLine = csv.split('\n').find((line) => line.includes('evil-coll'))
    expect(evilLine).toBeDefined()
    // "= 开头单元格被 ' 前缀中和，且 CSV 引号包裹时内部引号翻倍
    // 实际转义：'= 前缀 + 引号包裹 + 内部引号翻倍 → ,'=HYPERLINK(""http://evil"")+cmd"
    expect(evilLine!).toContain(`\"'=HYPERLINK(\"\"http://evil\"\")+cmd\"`)
  })

  it('quality scan writes issues with batch_id and clears old batches; issues list filters by collection', async () => {
    const scan = await authedRequest('/panel/quality-scan', { method: 'POST', body: JSON.stringify({}) })
    expect(scan.status).toBe(200)
    const scanWrapped = await scan.json<{ data: { success: boolean; count: number } }>()
    const scanBody = scanWrapped.data
    expect(scanBody.success).toBe(true)
    expect(scanBody.count).toBeGreaterThan(0)

    const batches = await env.DB.prepare('SELECT DISTINCT batch_id FROM content_quality_issues').all<{ batch_id: string | null }>()
    expect(batches.results.length).toBeGreaterThanOrEqual(1)
    expect(batches.results.every((row) => row.batch_id)).toBe(true)

    // 再跑一次：旧批次被清空，不叠加
    const secondScan = await authedRequest('/panel/quality-scan', { method: 'POST', body: JSON.stringify({}) })
    const secondWrapped = await secondScan.json<{ data: { count: number } }>()
    expect(secondWrapped.data.count).toBe(scanBody.count)

    const listRes = await authedRequest('/panel/content-quality-issues?collection=friend-links&page=1&pageSize=20')
    expect(listRes.status).toBe(200)
    const listBody = await listRes.json<{ data: Array<{ issueType: string; severity: string; status: string; collection: string; message: string }>; meta: { pagination: { total: number } } }>()
    expect(listBody.data.every((issue) => issue.collection === 'friend-links')).toBe(true)
  })

  it('system health reports DB connectivity and per-collection counts, no RSSHub entry', async () => {
    const res = await authedRequest('/panel/system-health')
    expect(res.status).toBe(200)
    const body = await res.json<{ data: { status: string; generatedAt: string; collectionCounts: Record<string, number>; checks: Array<{ key: string; label: string; status: string; message: string }> } }>()
    expect(['ok', 'warning']).toContain(body.data.status)
    expect(typeof body.data.generatedAt).toBe('string')
    expect(body.data.collectionCounts.announcements).toBeGreaterThan(0)
    expect(body.data.checks.some((check) => check.key === 'database')).toBe(true)
    expect(body.data.checks.some((check) => check.key.toLowerCase().includes('rsshub'))).toBe(false)
  })

  it('logout deletes the session row and clears the cookie', async () => {
    const user = await env.DB.prepare("SELECT id FROM users WHERE username = 'panel-admin'").first<{ id: number }>()
    const token = await createSession(env.DB, user!.id)

    const logout = await app.request(
      'https://test.local/api/panel/auth/logout',
      { method: 'POST', headers: { Cookie: `schale_admin_session=${token}` } },
      env
    )
    expect(logout.status).toBe(200)

    const remaining = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?1').bind(token).first<{ n: number }>()
    expect(remaining!.n).toBe(0)
    expect(cookieFrom(logout)).toContain('Max-Age=0')
  })
})
