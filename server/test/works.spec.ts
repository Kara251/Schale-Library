/**
 * works 域公开 API 测试。
 * 用例：列表 isActive 过滤 + featured 排序、草稿不可见、students[] 聚合输出、
 * $or 搜索（title/author/students.name）、详情 by id/documentId、404。
 */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../src/index'
import { applyBaseline, applyMigration, resetAllContent } from './helpers'

const NOW = Date.now()
const DAY = 86_400_000

async function seedWork(overrides: Record<string, unknown>, studentIds: number[] = []): Promise<number> {
  const res = await env.DB.prepare(
    'INSERT INTO works (document_id, title, author, description, cover_image_url, cover_image_url_external, nature, work_type, link, source_platform, source_url, source_id, is_featured, featured_priority, featured_reason, featured_until, is_active, is_auto_imported, original_publish_date, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id'
  )
    .bind(
      overrides.document_id ?? `wk-${Math.random().toString(36).slice(2, 10)}`,
      overrides.title ?? '默认作品',
      overrides.author ?? null,
      overrides.description ?? null,
      overrides.cover_image_url ?? null,
      overrides.cover_image_url_external ?? null,
      overrides.nature ?? 'fanmade',
      overrides.work_type ?? 'video',
      overrides.link ?? null,
      overrides.source_platform ?? null,
      overrides.source_url ?? null,
      overrides.source_id ?? null,
      overrides.is_featured ?? 0,
      overrides.featured_priority ?? 0,
      overrides.featured_reason ?? null,
      overrides.featured_until ?? null,
      overrides.is_active ?? 1,
      overrides.is_auto_imported ?? 0,
      overrides.original_publish_date ?? null,
      overrides.created_at ?? NOW - DAY,
      overrides.updated_at ?? NOW - DAY,
      overrides.published_at !== undefined ? overrides.published_at : NOW - DAY
    )
    .first<{ id: number }>()
  const id = res!.id
  for (const [i, sid] of studentIds.entries()) {
    await env.DB.prepare('INSERT INTO works_students (work_id, student_id, sort_order) VALUES (?,?,?)').bind(id, sid, i).run()
  }
  return id
}

async function seedStudent(name: string): Promise<number> {
  const res = await env.DB.prepare('INSERT INTO students (document_id, slug, name, organization, school_id, created_at, updated_at, published_at) VALUES (?,?,?,?,NULL,?,?,?) RETURNING id')
    .bind(`st-${Math.random().toString(36).slice(2, 10)}`, name, name, null, NOW, NOW, NOW)
    .first<{ id: number }>()
  return res!.id
}

const WORK_TABLES = ['works_students', 'works', 'students']

function resetContentTables(): Promise<void> {
  return resetAllContent(env.DB)
}

describe('GET /works', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('isActive 过滤 + isFeatured/featuredPriority 排序', async () => {
    const s1 = await seedStudent('白子')
    await seedWork({ title: '推荐旧作', is_featured: 1, featured_priority: 1 })
    await seedWork({ title: '推荐新作', is_featured: 1, featured_priority: 9 }, [s1])
    await seedWork({ title: '普通作品' })

    const r = await app.request('/api/works?filters[is_active][$eq]=true&sort[0]=isFeatured:desc&sort[1]=featuredPriority:desc', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<Record<string, unknown>>; meta: { pagination: { total: number } } }
    expect(body.data.map((d) => d.title)).toEqual(['推荐新作', '推荐旧作', '普通作品'])
    expect(body.meta.pagination.total).toBe(3)

    // students[] 关联聚合
    const featured = body.data[0]
    expect(featured.students).toEqual([{ id: s1, documentId: expect.any(String), name: '白子' }])
  })

  it('草稿（published_at NULL）与停用（is_active=0）不可见', async () => {
    await seedWork({ title: '草稿作品', published_at: null })
    await seedWork({ title: '已下架作品', is_active: 0 })
    await seedWork({ title: '在架作品' })

    const r = await app.request('/api/works', {}, env)
    const body = (await r.json()) as { data: Array<{ title: string }> }
    expect(body.data.map((d) => d.title)).toEqual(['在架作品'])
  })

  it('$or 搜索命中 title 或 author 或学生名', async () => {
    const s = await seedStudent('星野')
    await seedWork({ title: '特别的视频' })
    await seedWork({ author: '阿露老师', title: '无关标题' })
    await seedWork({ title: '第三支', author: ' nobody ' }, [s])

    const r = await app.request('/api/works?filters[$or][0][title][$containsi]=特别&filters[$or][1][author][$containsi]=特别&filters[$or][3][students][name][$containsi]=特别&filters[is_active][$eq]=true', {}, env)
    let body = (await r.json()) as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)

    // 学生名搜索：$or 组内 name 命中
    const r2 = await app.request(`/api/works?filters[$or][0][title][$containsi]=星野&filters[$or][3][students][name][$containsi]=星野&filters[is_active][$eq]=true`, {}, env)
    body = (await r2.json()) as { data: Array<{ title: string }> }
    expect(body.data.map((d) => d.title)).toEqual(['第三支'])
  })

  it('author eq + id ne 过滤（getWorksByAuthor 场景）', async () => {
    const currentId = await seedWork({ author: '同作者', title: '当前作品' })
    await seedWork({ author: '同作者', title: '其他作品A' })
    await seedWork({ author: '另一位', title: '其他作品B' })

    const r = await app.request(`/api/works?filters[author][$eq]=${encodeURIComponent('同作者')}&filters[id][$ne]=${currentId}`, {}, env)
    const body = (await r.json()) as { data: Array<{ title: string; author?: string }> }
    expect(body.data.map((d) => d.title)).toEqual(['其他作品A'])
  })
})

describe('GET /works/:key', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('documentId 与数字 id 详情均返回完整消费字段', async () => {
    const id = await seedWork({
      title: '封面外链作品',
      description: '一段简介',
      cover_image_url_external: 'https://cdn.example.com/cover.jpg',
      nature: 'official',
      work_type: 'image',
    })
    const doc = await env.DB.prepare('SELECT document_id FROM works WHERE id = ?').bind(id).first<{ document_id: string }>()

    for (const key of [String(id), doc!.document_id]) {
      const r = await app.request(`/api/works/${key}`, {}, env)
      expect(r.status).toBe(200)
      const body = (await r.json()) as { data: Record<string, unknown> }
      expect(body.data.id).toBe(id)
      expect(body.data.coverImage).toEqual({ url: 'https://cdn.example.com/cover.jpg' })
      expect(body.data.workType).toBe('image')
      expect(body.data.isActive).toBe(true)
    }

    const missing = await app.request('/api/works/no-such-doc', {}, env)
    expect(missing.status).toBe(404)
  })
})
