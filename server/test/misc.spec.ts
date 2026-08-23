/**
 * misc 域公开 API 测试：公告 / 友链 / 学院 / 剧透档位。
 * 用例：公告 locale 回退 + isPinned/priority 排序、停用与草稿不可见、
 * $or 搜索、友链 isActive 过滤、schools 排序、spoiler-tiers 顺序。
 */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../src/index'
import { applyBaseline, applyMigration, resetAllContent } from './helpers'

const NOW = Date.now()
const HOUR = 3600_000

async function seedAnnouncement(overrides: Record<string, unknown>): Promise<void> {
  await env.DB.prepare('INSERT INTO announcements (document_id, title_json, content_json, cover_image_url, link, priority, is_pinned, is_active, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .bind(
      overrides.document_id ?? `an-${Math.random().toString(36).slice(2, 10)}`,
      overrides.title_json,
      overrides.content_json ?? null,
      overrides.cover_image_url ?? null,
      overrides.link ?? null,
      overrides.priority ?? 0,
      overrides.is_pinned ?? 0,
      overrides.is_active ?? 1,
      overrides.created_at ?? NOW,
      overrides.updated_at ?? NOW,
      overrides.published_at !== undefined ? overrides.published_at : NOW - HOUR
    )
    .run()
}

const MISC_TABLES = ['announcements', 'friend_links', 'schools', 'spoiler_tiers']

function resetContentTables(): Promise<void> {
  return resetAllContent(env.DB)
}

describe('GET /announcements', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('locale 回退（en 缺失 zh-Hans → 回退 en）+ 三键排序', async () => {
    await seedAnnouncement({ title_json: JSON.stringify({ en: 'Pinned EN' }), is_pinned: 1, priority: 1 })
    await seedAnnouncement({ title_json: JSON.stringify({ 'zh-Hans': '高优先级' }), priority: 10 })
    await seedAnnouncement({ title_json: JSON.stringify({ 'zh-Hans': '普通公告', en: 'Normal EN' }) })

    const r = await app.request('/announcements?locale=zh-Hans&sort[0]=isPinned:desc&sort[1]=priority:desc', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<Record<string, unknown>> }
    expect(body.data.map((d) => d.title)).toEqual(['Pinned EN', '高优先级', '普通公告'])
    // 消费字段对拍
    const first = body.data[0]
    for (const key of ['id', 'documentId', 'title', 'content', 'coverImage', 'link', 'priority', 'isPinned', 'publishedAt']) {
      expect(first).toHaveProperty(key)
    }
  })

  it('停用（isActive=0）与草稿不可见', async () => {
    await seedAnnouncement({ title_json: JSON.stringify({ 'zh-Hans': '正常' }) })
    await seedAnnouncement({ title_json: JSON.stringify({ 'zh-Hans': '已停用' }), is_active: 0 })
    await seedAnnouncement({ title_json: JSON.stringify({ 'zh-Hans': '草稿' }), published_at: null })

    const r = await app.request('/announcements', {}, env)
    const body = (await r.json()) as { data: Array<{ title: string }> }
    expect(body.data.map((d) => d.title)).toEqual(['正常'])
  })

  it('$or 搜索 title/content containsi', async () => {
    await seedAnnouncement({ title_json: JSON.stringify({ 'zh-Hans': '维护通知' }), content_json: JSON.stringify({ 'zh-Hans': '例行维护' }) })
    await seedAnnouncement({ title_json: JSON.stringify({ 'zh-Hans': '活动预告' }), content_json: JSON.stringify({ 'zh-Hans': '新活动上线，期间服务器不维护' }) })
    await seedAnnouncement({ title_json: JSON.stringify({ 'zh-Hans': '无关内容' }), content_json: JSON.stringify({ 'zh-Hans': '别的消息' }) })

    const r = await app.request('/announcements?filters[$or][0][title][$containsi]=维护&filters[$or][1][content][$containsi]=维护', {}, env)
    const body = (await r.json()) as { data: Array<{ title: string }> }
    expect(new Set(body.data.map((d) => d.title))).toEqual(new Set(['维护通知', '活动预告']))
  })

  it('详情端点 documentId 命中 + 404 保护', async () => {
    const docId = `an-detail-${Math.random().toString(36).slice(2, 8)}`
    await seedAnnouncement({ document_id: docId, title_json: JSON.stringify({ 'zh-Hans': '详情公告' }), content_json: JSON.stringify({ 'zh-Hans': '<p>正文</p>' }) })

    const r = await app.request(`/announcements/${docId}`, {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Record<string, unknown> }
    expect(body.data.content).toBe('<p>正文</p>')
    expect(body.data.documentId).toBe(docId)

    const missing = await app.request('/announcements/an-missing-doc-id', {}, env)
    expect(missing.status).toBe(404)
  })
})

describe('GET /friend-links', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('仅输出激活友链并含 icon.url 消费字段', async () => {
    for (const active of [1, 1, 0]) {
      await env.DB.prepare('INSERT INTO friend_links (document_id, title_json, description_json, url, icon_url, priority, is_active, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(`fl-${Math.random().toString(36).slice(2, 8)}`, JSON.stringify({ 'zh-Hans': `友链${active}` }), JSON.stringify({ 'zh-Hans': '描述' }), 'https://friend.example.com', 'https://cdn.example.com/icon.png', 5 - active, active, NOW, NOW, NOW)
        .run()
    }

    const r = await app.request('/friend-links', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<Record<string, unknown>>; meta: { pagination: { total: number } } }
    expect(body.meta.pagination.total).toBe(2)
    expect(body.data[0].icon).toEqual({ url: 'https://cdn.example.com/icon.png' })
    expect(body.data[0].url).toBe('https://friend.example.com')
  })
})

describe('GET /schools', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('按 sort_order 输出且 name 走 locale 解析', async () => {
    for (const slug of ['gehenna', 'abydos']) {
      await env.DB.prepare('INSERT INTO schools (document_id, slug, name_json, color, sort_order, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(`sc-${slug}`, slug, JSON.stringify({ 'zh-Hans': slug === 'gehenna' ? '格黑娜学园' : '阿拜多斯高等学校', en: slug }), '#abc', slug === 'gehenna' ? 2 : 1, NOW, NOW, NOW)
        .run()
    }
    await env.DB.prepare('INSERT INTO schools (document_id, slug, name_json, color, sort_order, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind('sc-draft', 'srt', JSON.stringify({ 'zh-Hans': 'SRT' }), '#fff', 3, NOW, NOW, null)
      .run()

    const r = await app.request('/schools?locale=en', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<{ slug: string; name: string; order: number }> }
    expect(body.data.map((d) => d.slug)).toEqual(['abydos', 'gehenna'])
    expect(body.data[0].name).toBe('abydos') // locale=en 直取
  })
})

describe('GET /spoiler-tiers', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('全量按 sort_order 升序返回', async () => {
    for (const [key, order] of [['final', 2], ['none', 0], ['vol3', 1]] as Array<[string, number]>) {
      await env.DB.prepare('INSERT INTO spoiler_tiers (document_id, key, title_json, sort_order) VALUES (?,?,?,?)')
        .bind(`sp-${key}`, key, JSON.stringify({ 'zh-Hans': `档位${order}` }), order)
        .run()
    }

    const r = await app.request('/spoiler-tiers', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<{ key: string; name: string }> }
    expect(body.data.map((d) => d.key)).toEqual(['none', 'vol3', 'final'])
  })
})
