/**
 * creators 域公开 API 测试。
 * 用例：featured 置顶排序、filters[isFeatured][$eq]=true 过滤、
 * bio_json locale 回退、slug 详情 populate（students + representativeWorks 按序）、
 * name containsi 搜索。
 */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../src/index'
import { applyBaseline, applyMigration, resetAllContent } from './helpers'

const NOW = Date.now()

async function seedCreator(overrides: Record<string, unknown>): Promise<number> {
  const res = await env.DB.prepare(
    `INSERT INTO creators (document_id, slug, name, avatar_url, bio_json, platform, platform_uid, homepage_url, is_featured, featured_priority, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`
  )
    .bind(
      overrides.document_id ?? `cr-${Math.random().toString(36).slice(2, 10)}`,
      overrides.slug ?? overrides.name as string,
      overrides.name,
      overrides.avatar_url ?? null,
      overrides.bio_json ?? null,
      overrides.platform ?? 'bilibili',
      overrides.platform_uid ?? null,
      overrides.homepage_url ?? null,
      overrides.is_featured !== undefined ? overrides.is_featured : 0,
      overrides.featured_priority ?? 0,
      overrides.created_at ?? NOW,
      overrides.updated_at ?? NOW,
      overrides.published_at !== undefined ? overrides.published_at : NOW
    )
    .first<{ id: number }>()
  return res!.id
}

async function seedStudent(overrides: Record<string, unknown>): Promise<number> {
  const res = await env.DB.prepare(
    `INSERT INTO students (document_id, slug, name, avatar_url, organization, wiki_url, school_id, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`
  )
    .bind(
      overrides.document_id ?? `st-${Math.random().toString(36).slice(2, 10)}`,
      overrides.slug ?? overrides.name as string,
      overrides.name,
      overrides.avatar_url ?? null,
      overrides.organization ?? null,
      overrides.wiki_url ?? null,
      overrides.school_id ?? null,
      overrides.created_at ?? NOW,
      overrides.updated_at ?? NOW,
      overrides.published_at !== undefined ? overrides.published_at : NOW
    )
    .first<{ id: number }>()
  return res!.id
}

async function linkCreatorStudent(creatorId: number, studentId: number): Promise<void> {
  await env.DB.prepare('INSERT INTO creator_students (creator_id, student_id) VALUES (?,?)').bind(creatorId, studentId).run()
}

beforeAll(async () => {
  await applyBaseline(env.DB)
  await applyMigration(env.DB, 'migrations/0002_works.sql')
})
beforeEach(() => resetAllContent(env.DB))

describe('GET /creators', () => {
  it('featured 置顶排序（isFeatured desc → featuredPriority desc）并输出形状', async () => {
    await seedCreator({ slug: 'normal-a', name: '普通A', is_featured: 0, featured_priority: 9 })
    await seedCreator({ slug: 'feat-b', name: '精选B', is_featured: 1, featured_priority: 5 })
    await seedCreator({ slug: 'feat-c', name: '精选C', is_featured: 1, featured_priority: 7 })

    const r = await app.request('/api/creators?sort[0]=isFeatured:desc&sort[1]=featuredPriority:desc', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<Record<string, unknown>>; meta: { pagination: { total: number } } }
    expect(body.data.map((d) => d.slug)).toEqual(['feat-c', 'feat-b', 'normal-a'])
    expect(body.meta.pagination.total).toBe(3)

    const featB = body.data[1]
    expect(featB).toMatchObject({
      platform: 'bilibili',
      isFeatured: true,
      featuredPriority: 5,
      students: [],
      representativeWorks: [],
    })
    expect(typeof featB.createdAt).toBe('string')
  })

  it('filters[isFeatured][$eq]=true 仅返回精选', async () => {
    await seedCreator({ slug: 'normal-a', name: '普通A' })
    await seedCreator({ slug: 'feat-b', name: '精选B', is_featured: 1, featured_priority: 3 })

    const r = await app.request('/api/creators?filters[isFeatured][$eq]=true', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<{ slug: string; isFeatured: boolean }> }
    expect(body.data.map((d) => d.slug)).toEqual(['feat-b'])
    expect(body.data[0].isFeatured).toBe(true)
  })

  it('bio_json 按 locale 回退（请求 locale → zh-Hans → en）', async () => {
    await seedCreator({
      slug: 'bio-fallback',
      name: '双语作者',
      bio_json: JSON.stringify({ en: 'English bio', ja: '日本語の紹介' }),
    })

    // zh-Hans 缺失 → 回退 en（FALLBACK_ORDER 中 en 先于 ja）
    const zh = await app.request('/api/creators?locale=zh-Hans', {}, env)
    const zhBody = (await zh.json()) as { data: Array<{ bio?: string }> }
    expect(zhBody.data[0].bio).toBe('English bio')

    // 直接命中 en
    const en = await app.request('/api/creators?locale=en', {}, env)
    const enBody = (await en.json()) as { data: Array<{ bio?: string }> }
    expect(enBody.data[0].bio).toBe('English bio')
  })

  it('分页生效', async () => {
    for (const i of [1, 2, 3]) {
      await seedCreator({ slug: `p-${i}`, name: `作者${i}`, created_at: NOW + i, updated_at: NOW + i })
    }

    const r = await app.request('/api/creators?pagination[page]=2&pagination[pageSize]=2&sort=updatedAt:desc', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<{ slug: string }>; meta: { pagination: { page: number; pageCount: number; total: number } } }
    expect(body.data.map((d) => d.slug)).toEqual(['p-1'])
    expect(body.meta.pagination).toMatchObject({ page: 2, pageCount: 2, total: 3 })
  })

  it('filters[name][$containsi] 搜索（global-search 场景）', async () => {
    await seedCreator({ slug: 'alpha-cc', name: 'AlphaCC' })
    await seedCreator({ slug: 'beta-draw', name: 'BetaDraw' })

    const r = await app.request('/api/creators?filters[name][$containsi]=alphacc', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<{ slug: string }> }
    expect(body.data.map((d) => d.slug)).toEqual(['alpha-cc'])
  })

  it('草稿不可见', async () => {
    await seedCreator({ slug: 'published', name: '已发布' })
    await seedCreator({ slug: 'draft', name: '草稿', published_at: null })

    const r = await app.request('/api/creators', {}, env)
    const body = (await r.json()) as { data: Array<{ slug: string }> }
    expect(body.data.map((d) => d.slug)).toEqual(['published'])
  })
})

describe('GET /creators/:slug', () => {
  it('slug 详情 populate students 与 representativeWorks（按 sort_order）', async () => {
    const schoolId = await env.DB.prepare(
      `INSERT INTO schools (document_id, slug, name_json, color, sort_order, created_at, updated_at, published_at) VALUES ('sc-geh','gehenna','{"zh-Hans":"格黑娜学园"}','#ff0000',0,?,?,?) RETURNING id`
    )
      .bind(NOW, NOW, NOW)
      .first<{ id: number }>()

    const s1 = await seedStudent({ name: '星野' })
    const sDraft = await seedStudent({ name: '草稿学生', published_at: null })
    const s2 = await seedStudent({ name: '白子', school_id: schoolId!.id, avatar_url: 'https://cdn.example.com/s.png' })

    const creatorId = await seedCreator({
      slug: 'studio-x',
      name: 'X工作室',
      avatar_url: 'https://cdn.example.com/x.png',
      bio_json: JSON.stringify({ 'zh-Hans': '同人社团' }),
      is_featured: 1,
      featured_priority: 2,
    })
    await linkCreatorStudent(creatorId, s1)
    await linkCreatorStudent(creatorId, sDraft) // 草稿学生不得出现在 populate 中
    await linkCreatorStudent(creatorId, s2)

    await env.DB.prepare(
      `INSERT INTO representative_works (creator_id, sort_order, title, url, cover_url, note_json) VALUES (?,?,?,?,?,?)`
    )
      .bind(creatorId, 2, '第二作', 'https://example.com/works/2', 'https://cdn.example.com/c2.png', '{"zh-Hans":"续篇"}')
      .run()
    await env.DB.prepare(
      `INSERT INTO representative_works (creator_id, sort_order, title, url, cover_url, note_json) VALUES (?,?,?,?,?,?)`
    )
      .bind(creatorId, 1, '第一作', 'https://example.com/works/1', null, null)
      .run()

    const r = await app.request('/api/creators/studio-x?locale=zh-Hans&populate=students,representativeWorks', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as {
      data: {
        slug: string
        bio?: string
        avatarUrl?: string
        isFeatured: boolean
        students: Array<Record<string, unknown>>
        representativeWorks: Array<Record<string, unknown>>
      }
    }

    expect(body.data.slug).toBe('studio-x')
    expect(body.data.bio).toBe('同人社团')
    expect(body.data.avatarUrl).toBe('https://cdn.example.com/x.png')
    expect(body.data.isFeatured).toBe(true)

    // 学生 populate：草稿剔除，school_ref JOIN 生效
    expect(body.data.students.map((s) => s.name)).toEqual(['星野', '白子'])
    expect(body.data.students[1]).toMatchObject({
      slug: '白子',
      school_ref: { slug: 'gehenna', name: '格黑娜学园' },
      avatar: { url: 'https://cdn.example.com/s.png' },
    })

    // 代表作按 sort_order 升序，note 走 locale 回退
    expect(body.data.representativeWorks.map((w) => w.title)).toEqual(['第一作', '第二作'])
    expect(body.data.representativeWorks[0]).toMatchObject({ url: 'https://example.com/works/1', sortOrder: 1 })
    expect(body.data.representativeWorks[1]).toMatchObject({ note: '续篇', coverUrl: 'https://cdn.example.com/c2.png' })
  })

  it('documentId 详情与 404 保护', async () => {
    const creatorId = await seedCreator({ slug: 'doc-test', name: '文档测试' })
    const doc = await env.DB.prepare('SELECT document_id FROM creators WHERE id = ?').bind(creatorId).first<{ document_id: string }>()

    const byDoc = await app.request(`/api/creators/${doc!.document_id}`, {}, env)
    expect(byDoc.status).toBe(200)

    const missing = await app.request('/api/creators/no-such-creator', {}, env)
    expect(missing.status).toBe(404)
  })
})
