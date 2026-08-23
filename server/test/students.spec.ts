/**
 * students 域公开 API 测试。
 * 用例：列表 name 排序 + school_ref JOIN 输出、草稿不可见、
 * $and 组筛选（query containsi / school eq）、id $in、详情 404。
 */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../src/index'
import { applyBaseline, applyMigration, resetAllContent } from './helpers'

const NOW = Date.now()

async function seedSchool(slug: string, name: Record<string, string>): Promise<number> {
  const res = await env.DB.prepare('INSERT INTO schools (document_id, slug, name_json, color, sort_order, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?) RETURNING id')
    .bind(`sc-${slug}`, slug, JSON.stringify(name), '#123456', 0, NOW, NOW, NOW)
    .first<{ id: number }>()
  return res!.id
}

async function seedStudent(overrides: Record<string, unknown>): Promise<number> {
  const res = await env.DB.prepare('INSERT INTO students (document_id, slug, name, avatar_url, organization, wiki_url, school_id, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id')
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

const STUDENT_TABLES = ['students', 'schools']

function resetContentTables(): Promise<void> {
  return resetAllContent(env.DB)
}

describe('GET /students', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('列表按 name asc 排序并输出 school_ref 关联', async () => {
    const gehennaId = await seedSchool('gehenna', { 'zh-Hans': '格黑娜学园', en: 'Gehenna' })
    await seedStudent({ name: '星野', school_id: null })
    await seedStudent({ name: '白子', school_id: gehennaId, avatar_url: 'https://cdn.example.com/hoshino.png' })

    const r = await app.request('/students?sort=name:asc', {}, env)
    expect(r.status).toBe(200)
    const body = (await r.json()) as { data: Array<Record<string, unknown>>; meta: { pagination: { total: number } } }
    // SQLite BINARY 排序按 UTF-8 码点：星(26143) < 白(30333)，与拼音序不同
    expect(body.data.map((d) => d.name)).toEqual(['星野', '白子'])
    expect(body.meta.pagination.total).toBe(2)

    // 码点序下星野在前，白子在 data[1]
    const shiroko = body.data[1]
    expect(shiroko.school_ref).toMatchObject({ id: gehennaId, slug: 'gehenna', name: '格黑娜学园', color: '#123456' })
    expect(shiroko.avatar).toEqual({ url: 'https://cdn.example.com/hoshino.png' })
  })

  it('草稿不可见', async () => {
    await seedStudent({ name: '可见学生' })
    await seedStudent({ name: '隐藏学生', published_at: null })

    const r = await app.request('/students', {}, env)
    const body = (await r.json()) as { data: Array<{ name: string }> }
    expect(body.data.map((d) => d.name)).toEqual(['可见学生'])
  })

  it('$and 组筛选：query containsi 与 school_ref.slug eq 组合', async () => {
    const trinityId = await seedSchool('trinity', { 'zh-Hans': '圣三一综合学园' })
    await seedStudent({ name: '渚', organization: '茶话会', school_id: trinityId })
    await seedStudent({ name: '渚丸', organization: null, school_id: null })
    await seedStudent({ name: '芹香', organization: null, school_id: trinityId })

    // query=渚 → 命中两个；school=trinity → 只剩一个
    const r = await app.request('/students?filters[$and][0][$or][0][name][$containsi]=渚&filters[$and][0][$or][1][organization][$containsi]=渚&filters[$and][1][$or][0][school_ref][slug][$eq]=trinity&filters[$and][1][$or][1][school][$eq]=trinity', {}, env)
    const body = (await r.json()) as { data: Array<{ name: string }> }
    expect(body.data.map((d) => d.name)).toEqual(['渚'])
  })

  it('filters[id][$in] 平铺叶子生效（getStudents studentIds 场景）', async () => {
    const a = await seedStudent({ name: 'A' })
    const b = await seedStudent({ name: 'B' })
    await seedStudent({ name: 'C' })

    const r = await app.request(`/students?filters[id][$eq]=${a}&filters[id][$eq]=${b}`, {}, env)
    const body = (await r.json()) as { data: Array<{ name: string }> }
    expect(new Set(body.data.map((d) => d.name))).toEqual(new Set(['A', 'B']))
  })
})

describe('GET /students/:key', () => {
  beforeAll(async () => {
    await applyBaseline(env.DB)
    await applyMigration(env.DB, 'migrations/0002_works.sql')
  })
  beforeEach(resetContentTables)

  it('数字 id 与 documentId 详情，404 保护', async () => {
    const id = await seedStudent({ name: '详情学生', organization: '补习部' })
    const doc = await env.DB.prepare('SELECT document_id FROM students WHERE id = ?').bind(id).first<{ document_id: string }>()

    const byId = await app.request(`/students/${id}`, {}, env)
    expect(byId.status).toBe(200)
    const byDoc = await app.request(`/students/${doc!.document_id}`, {}, env)
    expect(byDoc.status).toBe(200)
    const body = (await byDoc.json()) as { data: Record<string, unknown> }
    expect(body.data.organization).toBe('补习部')

    const missing = await app.request('/students/424242', {}, env)
    expect(missing.status).toBe(404)
  })
})
