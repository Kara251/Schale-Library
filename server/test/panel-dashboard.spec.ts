/**
 * 仪表盘计数端点：一次请求取回全部集合总数。
 * 关键在于视图集合（online-events / offline-events）必须各自按判别列计数，
 * 而不是都返回 events 全表的行数。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { applyMigration } from './helpers'
import { hashPassword } from '../src/auth/password'
import { createSession } from '../src/auth/session'
import { COLLECTIONS } from '../src/panel/collections'
import app from '../src/index'

const ADMIN = { identifier: 'dash-admin', password: 'dash-pass-12345' }
let userId: number

async function authed(path: string): Promise<Response> {
  const token = await createSession(env.DB, userId)
  return app.request(`https://test.local/api${path}`, { headers: { Authorization: `Bearer ${token}` } }, env)
}

async function seedEvent(kind: 'online' | 'offline', suffix: string): Promise<void> {
  const now = Date.now()
  await env.DB.prepare(
    `INSERT INTO events (document_id, kind, nature, title_json, start_time, created_at, updated_at, published_at)
     VALUES (?1, ?2, 'fanmade', ?3, ?4, ?4, ?4, ?4)`
  )
    .bind(`ev-${suffix}`, kind, JSON.stringify({ 'zh-Hans': suffix }), now)
    .run()
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
    "INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, 'dash@example.com', ?2, 'maintainer', 0, 1, ?3)"
  )
    .bind(ADMIN.identifier, passwordHash, Date.now())
    .run()
  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?1')
    .bind(ADMIN.identifier)
    .first<{ id: number }>()
  userId = user!.id
})

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM events').run()
  await env.DB.prepare('DELETE FROM announcements').run()
})

describe('GET /panel/dashboard', () => {
  it('返回每个已登记集合的计数', async () => {
    const res = await authed('/panel/dashboard')
    expect(res.status).toBe(200)

    const body = (await res.json()) as { data: Record<string, number> }
    for (const key of Object.keys(COLLECTIONS)) {
      expect(Object.hasOwn(body.data, key), `缺少集合 ${key} 的计数`).toBe(true)
      expect(typeof body.data[key]).toBe('number')
    }
  })

  it('视图集合各自按判别列计数，不是共用整表行数', async () => {
    await seedEvent('online', 'a')
    await seedEvent('online', 'b')
    await seedEvent('offline', 'c')

    const body = (await (await authed('/panel/dashboard')).json()) as { data: Record<string, number> }
    expect(body.data['online-events']).toBe(2)
    expect(body.data['offline-events']).toBe(1)
    expect(body.data.events).toBe(3)
  })

  it('计数随数据变化', async () => {
    const before = (await (await authed('/panel/dashboard')).json()) as { data: Record<string, number> }
    expect(before.data.announcements).toBe(0)

    const now = Date.now()
    await env.DB.prepare(
      `INSERT INTO announcements (document_id, title_json, created_at, updated_at, published_at)
       VALUES ('an-1', ?1, ?2, ?2, ?2)`
    )
      .bind(JSON.stringify({ 'zh-Hans': 'x' }), now)
      .run()

    const after = (await (await authed('/panel/dashboard')).json()) as { data: Record<string, number> }
    expect(after.data.announcements).toBe(1)
  })

  it('未认证 → 401', async () => {
    const res = await app.request('https://test.local/api/panel/dashboard', {}, env)
    expect(res.status).toBe(401)
  })
})
