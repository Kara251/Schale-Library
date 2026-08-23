/**
 * online-events / offline-events 两个面板视图集合。
 * 后台仍按线上/线下分开维护，而 D1 侧已合并成 events 单表 —— 视图靠
 * fixedFilter(kind) 区分。这里锁的是作用域隔离：任何一侧都不能读写到另一侧的行。
 * 另外覆盖 offline-events 的 event_locations 副表读写。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { hashPassword } from '../src/auth/password'
import { createSession } from '../src/auth/session'
import app from '../src/index'

const ADMIN = { identifier: 'view-admin', password: 'view-pass-12345' }

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?1')
    .bind(ADMIN.identifier)
    .first<{ id: number }>()
  const token = await createSession(env.DB, user!.id)
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

/** 直接落一行 events，绕过面板，用于构造「另一侧」的数据。 */
async function seedEvent(kind: 'online' | 'offline', documentId: string): Promise<number> {
  const now = Date.now()
  const res = await env.DB.prepare(
    `INSERT INTO events (document_id, kind, nature, title_json, start_time, created_at, updated_at, published_at)
     VALUES (?1, ?2, 'fanmade', ?3, ?4, ?5, ?5, ?5) RETURNING id`
  )
    .bind(documentId, kind, JSON.stringify({ 'zh-Hans': `${kind} 活动` }), now, now)
    .first<{ id: number }>()
  return res!.id
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
  const passwordHash = await hashPassword(ADMIN.password)
  await env.DB.prepare(
    "INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, 'view@example.com', ?2, 'maintainer', 0, 1, ?3)"
  )
    .bind(ADMIN.identifier, passwordHash, Date.now())
    .run()
})

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM event_locations').run()
  await env.DB.prepare('DELETE FROM events').run()
})

describe('视图集合的作用域隔离', () => {
  it('列表只返回本侧的行', async () => {
    await seedEvent('online', 'ev-on-1')
    await seedEvent('online', 'ev-on-2')
    await seedEvent('offline', 'ev-off-1')

    const online = (await (await authed('/panel/online-events?page=1&pageSize=50')).json()) as {
      data: Array<{ documentId: string }>
      meta: { pagination: { total: number } }
    }
    const offline = (await (await authed('/panel/offline-events?page=1&pageSize=50')).json()) as {
      data: Array<{ documentId: string }>
      meta: { pagination: { total: number } }
    }

    expect(online.meta.pagination.total).toBe(2)
    expect(offline.meta.pagination.total).toBe(1)
    expect(online.data.map((r) => r.documentId).sort()).toEqual(['ev-on-1', 'ev-on-2'])
    expect(offline.data.map((r) => r.documentId)).toEqual(['ev-off-1'])
  })

  it('拿另一侧的 documentId 读单条 → 404', async () => {
    await seedEvent('offline', 'ev-off-2')
    expect((await authed('/panel/online-events/ev-off-2')).status).toBe(404)
    expect((await authed('/panel/offline-events/ev-off-2')).status).toBe(200)
  })

  it('拿另一侧的 documentId 更新 → 404，且数据未被改动', async () => {
    await seedEvent('offline', 'ev-off-3')

    const res = await authed('/panel/online-events/ev-off-3', {
      method: 'PUT',
      body: JSON.stringify({ data: { organizer: '越权写入' } }),
    })
    expect(res.status).toBe(404)

    const row = await env.DB.prepare("SELECT organizer FROM events WHERE document_id = 'ev-off-3'").first<{
      organizer: string | null
    }>()
    expect(row!.organizer).toBeNull()
  })

  it('拿另一侧的 documentId 删除 → 404，且行还在', async () => {
    await seedEvent('offline', 'ev-off-4')

    expect((await authed('/panel/online-events/ev-off-4', { method: 'DELETE' })).status).toBe(404)

    const row = await env.DB.prepare("SELECT id FROM events WHERE document_id = 'ev-off-4'").first()
    expect(row).not.toBeNull()
  })

  it('批量操作不会波及另一侧', async () => {
    await seedEvent('offline', 'ev-off-5')

    const res = await authed('/panel/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ collection: 'online-events', action: 'delete', ids: ['ev-off-5'] }),
    })
    const body = (await res.json()) as { data: { updated: number; errors: string[] } }
    expect(body.data.updated).toBe(0)
    expect(body.data.errors.length).toBe(1)

    const row = await env.DB.prepare("SELECT id FROM events WHERE document_id = 'ev-off-5'").first()
    expect(row).not.toBeNull()
  })
})

describe('新建时判别列由服务端落值', () => {
  it('经 online-events 新建的行 kind=online', async () => {
    const res = await authed('/panel/online-events', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '新线上活动', nature: 'fanmade', organizer: '主办方' } }),
    })
    expect(res.status).toBe(200)
    const created = (await res.json()) as { data: { documentId: string } }

    const row = await env.DB.prepare('SELECT kind FROM events WHERE document_id = ?1')
      .bind(created.data.documentId)
      .first<{ kind: string }>()
    expect(row!.kind).toBe('online')
  })

  it('客户端指定 kind 会被当作未登记字段拒绝', async () => {
    const res = await authed('/panel/online-events', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '伪造', nature: 'fanmade', kind: 'offline' } }),
    })
    expect(res.status).toBe(400)
  })
})

describe('offline-events 的 event_locations 副表', () => {
  it('新建时写入副表，读取时拉平返回', async () => {
    const res = await authed('/panel/offline-events', {
      method: 'POST',
      body: JSON.stringify({
        data: { title: '线下场次', nature: 'fanmade', venue: '国际会展中心', city: '上海', mapUrl: 'https://example.com/map' },
      }),
    })
    expect(res.status).toBe(200)
    const created = (await res.json()) as { data: { documentId: string; venue: string; city: string } }

    expect(created.data.venue).toBe('国际会展中心')
    expect(created.data.city).toBe('上海')

    const got = (await (await authed(`/panel/offline-events/${created.data.documentId}`)).json()) as {
      data: { venue: string; city: string; mapUrl: string }
    }
    expect(got.data.venue).toBe('国际会展中心')
    expect(got.data.mapUrl).toBe('https://example.com/map')
  })

  it('更新副表字段走 upsert，已有行被就地改写而非新增', async () => {
    const created = (await (
      await authed('/panel/offline-events', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '场次', nature: 'fanmade', venue: '旧场地' } }),
      })
    ).json()) as { data: { documentId: string } }

    await authed(`/panel/offline-events/${created.data.documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { venue: '新场地', address: '某路 1 号' } }),
    })

    const rows = await env.DB.prepare('SELECT venue, address FROM event_locations').all<{
      venue: string
      address: string
    }>()
    expect(rows.results.length).toBe(1)
    expect(rows.results[0]!.venue).toBe('新场地')
    expect(rows.results[0]!.address).toBe('某路 1 号')
  })

  it('online-events 不认副表字段（线上活动没有场地）', async () => {
    const res = await authed('/panel/online-events', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '线上', nature: 'fanmade', venue: '不该有' } }),
    })
    expect(res.status).toBe(400)
  })

  it('删除主行时副表随外键级联清理', async () => {
    const created = (await (
      await authed('/panel/offline-events', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '待删', nature: 'fanmade', venue: '场地' } }),
      })
    ).json()) as { data: { documentId: string } }

    expect((await authed(`/panel/offline-events/${created.data.documentId}`, { method: 'DELETE' })).status).toBe(200)

    const left = await env.DB.prepare('SELECT COUNT(*) AS n FROM event_locations').first<{ n: number }>()
    expect(left!.n).toBe(0)
  })
})
