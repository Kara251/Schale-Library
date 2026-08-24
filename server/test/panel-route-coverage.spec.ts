/**
 * 面板路由覆盖：前端实际调用的每个端点，Worker 都必须有对应路由。
 *
 * 这类「前端调 A、Worker 注册 B」的错配已经出现三次（/api 前缀、内部限流端点、
 * quality/issues 与 quality/scan），共同点是没有任何编译期或启动期信号，
 * 只在用户点到那个页面时 404。端点清单取自 frontend/tests/contracts 快照
 * 与 frontend/src/lib/admin-panel/client.ts 的实际拼装。
 *
 * 断言只看「路由存在」（非 404），不校验业务语义 —— 那是各域自己的 spec 的事。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { applyMigration } from './helpers'
import { hashPassword } from '../src/auth/password'
import { createSession } from '../src/auth/session'
import { COLLECTIONS } from '../src/panel/collections'
import app from '../src/index'

const ADMIN = { identifier: 'route-admin', password: 'route-pass-12345' }
let userId: number

/** 每次请求单独建会话：清单里包含 logout，共用 token 会让后续用例全部 401。 */
async function freshToken(): Promise<string> {
  return createSession(env.DB, userId)
}

interface RouteCase {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  body?: unknown
}

/** 契约里前端会打的固定端点。 */
const CONTRACT_ROUTES: RouteCase[] = [
  { method: 'POST', path: '/api/auth/local', body: ADMIN },
  { method: 'GET', path: '/api/users/me?populate=role' },
  { method: 'GET', path: '/api/panel/auth/session' },
  { method: 'POST', path: '/api/panel/auth/logout' },
  { method: 'GET', path: '/api/panel/system/health' },
  { method: 'GET', path: '/api/panel/quality/issues?page=1&pageSize=20' },
  { method: 'POST', path: '/api/panel/quality/scan', body: {} },
  { method: 'GET', path: '/api/panel/research-curator?locale=zh-Hans' },
  { method: 'GET', path: '/api/panel/admin-audit-logs?page=1&pageSize=20' },
  { method: 'GET', path: '/api/panel/admin-audit-logs/export?action=all' },
  { method: 'POST', path: '/api/panel/bulk-action', body: { collection: 'announcements', action: 'publish', ids: ['nope'] } },
  { method: 'POST', path: '/api/panel/internal/rate-limit', body: { scope: 's', identifier: 'i', limit: 5, windowMs: 60_000 } },
  { method: 'POST', path: '/api/panel/upload' },
]

async function request(route: RouteCase): Promise<Response> {
  const init: RequestInit = {
    method: route.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await freshToken()}`,
      'CF-Connecting-IP': '198.19.0.1',
    },
  }
  if (route.body !== undefined) init.body = JSON.stringify(route.body)
  return app.request(`https://test.local${route.path}`, init, env)
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
  await applyMigration(env.DB, 'migrations/0002_works.sql')
  await applyMigration(env.DB, 'migrations/0003_spoiler_tiers_timestamps.sql')
  await applyMigration(env.DB, 'migrations/0004_citation_source_image.sql')

  const passwordHash = await hashPassword(ADMIN.password)
  await env.DB.prepare(
    "INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, 'route@example.com', ?2, 'maintainer', 0, 1, ?3)"
  )
    .bind(ADMIN.identifier, passwordHash, Date.now())
    .run()

  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?1')
    .bind(ADMIN.identifier)
    .first<{ id: number }>()
  userId = user!.id
})

describe('契约端点都有对应路由', () => {
  it.each(CONTRACT_ROUTES.map((r) => [`${r.method} ${r.path.split('?')[0]}`, r] as const))(
    '%s 不是 404',
    async (_label, route) => {
      const res = await request(route)
      expect(res.status, `${route.method} ${route.path} 返回 404，说明 Worker 没有这条路由`).not.toBe(404)
    }
  )
})

describe('每个面板集合的 CRUD 路由都存在', () => {
  const keys = Object.keys(COLLECTIONS)

  it.each(keys)('%s 的列表路由存在', async (key) => {
    const res = await request({ method: 'GET', path: `/api/panel/${key}?page=1&pageSize=1&status=all` })
    expect(res.status, `/api/panel/${key} 列表 404`).not.toBe(404)
    expect(res.status, `/api/panel/${key} 列表出错`).toBe(200)
  })

  it.each(keys)('%s 的单条路由存在（不存在的 id 应 404 not_found 而非路由缺失）', async (key) => {
    const res = await request({ method: 'GET', path: `/api/panel/${key}/000000000000000000000000` })
    // 这里 404 是「内容不存在」的正确语义，用错误码区分于路由缺失
    expect(res.status).toBe(404)
    expect(await res.text()).toContain('not_found')
  })
})

describe('前端后台集合配置与 Worker 集合注册表一致', () => {
  // 前端 ADMIN_COLLECTION_CONFIG 的 endpoint 值（src/lib/admin-panel/collections.ts）。
  // 与 Worker 的 COLLECTIONS 键一一对应，否则该集合的后台页面整页取数失败。
  const FRONTEND_ENDPOINTS = [
    'announcements',
    'friend-links',
    'creator',
    'online-events',
    'offline-events',
    'students',
    'schools',
    'research-entries',
    'research-subjects',
    'research-paths',
    'research-themes',
    'research-citations',
    'spoiler-tiers',
  ]

  it.each(FRONTEND_ENDPOINTS)('%s 在 Worker 集合注册表里', (endpoint) => {
    expect(Object.hasOwn(COLLECTIONS, endpoint), `前端会请求 /api/panel/${endpoint}，但 Worker 没有登记该集合`).toBe(true)
  })
})
