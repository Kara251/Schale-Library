/**
 * events 域公开 API 测试。
 * 用例：locale 回退（zh-Hans 缺失时回退 en）、草稿不可见、relevant 排序、
 * 筛选（nature/city）、详情 by documentId 与数字 id、bundle 的 locationRecords 去重。
 */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../src/index'
import { applyBaseline, applyMigration, resetAllContent } from './helpers'

const NOW = Date.now()
const HOUR = 3600_000

async function seedEvent(overrides: Record<string, unknown>, location?: Record<string, string | null>): Promise<number> {
  const row: Record<string, unknown> = {
    document_id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    kind: 'online',
    title_json: JSON.stringify({ 'zh-Hans': '默认线上活动', en: 'Default Online' }),
    nature: 'official',
    organizer_verified: 0,
    created_at: NOW,
    updated_at: NOW,
    published_at: NOW - DAY,
    ...overrides,
  }
  const res = await env.DB.prepare(
    'INSERT INTO events (document_id, kind, title_json, description_json, nature, event_format, status_override, start_time, end_time, link, cover_image_url, organizer, organizer_verified, source_platform, source_url, tags_json, guests_json, ticket_price_text_json, price_min, price_max, currency, ticket_status, ticket_url, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id'
  )
    .bind(
      row.document_id,
      row.kind,
      row.title_json,
      row.description_json ?? null,
      row.nature,
      row.event_format ?? null,
      row.status_override ?? null,
      row.start_time ?? null,
      row.end_time ?? null,
      row.link ?? null,
      row.cover_image_url ?? null,
      row.organizer ?? null,
      row.organizer_verified ?? 0,
      row.source_platform ?? null,
      row.source_url ?? null,
      row.tags_json ?? null,
      row.guests_json ?? null,
      row.ticket_price_text_json ?? null,
      row.price_min ?? null,
      row.price_max ?? null,
      row.currency ?? null,
      row.ticket_status ?? null,
      row.ticket_url ?? null,
      row.created_at,
      row.updated_at,
      row.published_at
    )
    .first<{ id: number }>()
  const id = res!.id
  if (location) {
    await env.DB.prepare('INSERT INTO event_locations (event_id, country, region, city, venue, address, location_note, map_url) VALUES (?,?,?,?,?,?,?,?)').bind(
      id,
      location.country ?? null,
      location.region ?? null,
      location.city ?? null,
      location.venue ?? null,
      location.address ?? null,
      location.location_note ?? null,
      location.map_url ?? null
    ).run()
  }
  return id
}

const DAY = 86_400_000

const CONTENT_TABLES = ['event_locations', 'events']

function resetContentTables(): Promise<void> {
  return resetAllContent(env.DB)
}

describe('GET /online-events', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('返回已发布列表并按 locale 回退（zh-Hans 缺失 → en）', async () => {
    await seedEvent({ title_json: JSON.stringify({ en: 'EN Only Title' }), start_time: NOW + HOUR, end_time: NOW + 2 * HOUR })
    await seedEvent({ title_json: JSON.stringify({ 'zh-Hans': '中文标题' }), start_time: NOW + 3 * HOUR, end_time: NOW + 4 * HOUR })

    const r = await app.request('/api/online-events?locale=zh-Hans', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<Record<string, unknown>>; meta: { pagination: { total: number } } }
    expect(body.data).toHaveLength(2)
    const titles = body.data.map((d) => d.title)
    expect(titles).toContain('EN Only Title')
    expect(titles).toContain('中文标题')
    expect(body.meta.pagination.total).toBe(2)
    // 消费字段对拍
    const first = body.data[0]
    for (const key of ['id', 'documentId', 'title', 'nature', 'startTime', 'endTime', 'organizer', 'tags']) {
      expect(first).toHaveProperty(key)
    }
  })

  it('草稿（published_at NULL）不可见', async () => {
    await seedEvent({ published_at: null, title_json: JSON.stringify({ 'zh-Hans': '草稿活动' }) })
    await seedEvent({ title_json: JSON.stringify({ 'zh-Hans': '已发布' }) })

    const r = await app.request('/api/offline-events', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<Record<string, unknown>> }
    expect(body.data).toHaveLength(0)

    const r2 = await app.request('/api/online-events', {}, env)
    const body2 = (await r2.json()) as { data: Array<{ title: string }> }
    expect(body2.data.map((d) => d.title)).toEqual(['已发布'])
  })

  it('nature 筛选生效', async () => {
    await seedEvent({ nature: 'fanmade', title_json: JSON.stringify({ 'zh-Hans': '同人展' }) })
    await seedEvent({ nature: 'official', title_json: JSON.stringify({ 'zh-Hans': '官方直播' }) })

    const r = await app.request('/api/online-events?filters[nature][$eq]=fanmade', {}, env)
    const body = (await r.json()) as { data: Array<{ title: string; nature: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].title).toBe('同人展')
    expect(body.data[0].nature).toBe('fanmade')
  })
})

describe('GET /offline-events', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('输出 location/venue/city/mapUrl 消费字段并支持 city containsi 筛选', async () => {
    await seedEvent(
      { kind: 'offline', title_json: JSON.stringify({ 'zh-Hans': '东京展会' }) },
      { country: '日本', region: '关东', city: '东京', venue: '东京国际展示场', address: '江东区有明3-11-1', map_url: 'https://maps.example.com/tokyo' }
    )
    await seedEvent(
      { kind: 'offline', title_json: JSON.stringify({ 'zh-Hans': '上海展会' }) },
      { country: '中国', region: '华东', city: '上海', venue: '新国际博览中心', address: null, map_url: null }
    )

    const r = await app.request('/api/offline-events?filters[city][$containsi]=东京', {}, env)
    const body = (await r.json()) as { data: Array<Record<string, unknown>> }
    expect(body.data).toHaveLength(1)
    const ev = body.data[0]
    expect(ev.location).toContain('东京国际展示场')
    expect(ev.city).toBe('东京')
    expect(ev.mapUrl).toBe('https://maps.example.com/tokyo')
  })

  it('详情端点：数字 id 与 documentId 均可取，404 保护', async () => {
    const id = await seedEvent({
      kind: 'offline',
      title_json: JSON.stringify({ 'zh-Hans': '详情活动' }),
    }, { city: '京都' })

    const byId = await app.request(`/api/offline-events/${id}`, {}, env)
    expect(byId.status).toBe(200)
    const bodyById = (await byId.json()) as { data: Record<string, unknown> }
    expect(bodyById.data.id).toBe(id)

    const docRes = await env.DB.prepare('SELECT document_id FROM events WHERE id = ?').bind(id).first<{ document_id: string }>()
    const byDoc = await app.request(`/api/offline-events/${docRes!.document_id}`, {}, env)
    const bodyByDoc = (await byDoc.json()) as { data: Record<string, unknown> }
    expect(bodyByDoc.data.documentId).toBe(docRes!.document_id)

    const missing = await app.request('/api/offline-events/999999', {}, env)
    expect(missing.status).toBe(404)
  })
})

describe('GET /events-bundle', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('一次返回合并列表与去重 locationRecords', async () => {
    await seedEvent({ title_json: JSON.stringify({ 'zh-Hans': '线上A' }) }, { country: '日本', region: '全国' })
    await seedEvent({ title_json: JSON.stringify({ 'zh-Hans': '线上B' }) }, { country: '日本', region: '全国' }) // 同地区 → 去重
    await seedEvent(
      { kind: 'offline', title_json: JSON.stringify({ 'zh-Hans': '线下C' }) },
      { country: '日本', region: '关东', city: '千叶' }
    )

    const r = await app.request('/api/events-bundle', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as {
      data: Array<{ type: string; event: Record<string, unknown> }>
      meta: { pagination: { total: number } }
      locationRecords: Array<{ kind: string; country: string; region: string; city: string }>
    }
    expect(body.data).toHaveLength(3)
    expect(body.meta.pagination.total).toBe(3)
    expect(body.locationRecords).toEqual([
      { kind: 'online', country: '日本', region: '全国', city: '' },
      { kind: 'offline', country: '日本', region: '关东', city: '千叶' },
    ])
  })

  it('分页切片正确', async () => {
    for (let i = 0; i < 5; i++) {
      await seedEvent({ title_json: JSON.stringify({ 'zh-Hans': `第${i}场` }), start_time: NOW - i * HOUR })
    }
    const r = await app.request('/api/events-bundle?page=2&pageSize=2', {}, env)
    const body = (await r.json()) as { data: Array<{ event: { title: string } }>; meta: { pagination: { page: number; pageCount: number; total: number } } }
    expect(body.meta.pagination.page).toBe(2)
    expect(body.meta.pagination.total).toBe(5)
    expect(body.meta.pagination.pageCount).toBe(3)
    expect(body.data).toHaveLength(2)
  })
})
