/**
 * 考据域公开 API 测试：research-entries / research-paths / research-themes /
 * research-subjects / research-citations / research-graph。
 * 基线 schema 由 test/baseline.ts（Vite ?raw 预读）注入，走真实 Hono 路由。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'

import { BASELINE_STATEMENTS } from './baseline'
import { researchRoutes } from '../src/content/research'

const NOW = 1735689600000 // 2025-01-01T00:00:00Z

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
})

/** 以 Hono app.fetch 语义发起请求（bindings 注入 env.DB） */
async function req(path: string): Promise<Response> {
  return researchRoutes.request(path, {}, { DB: env.DB }) as unknown as Promise<Response>
}

async function insert(
  sql: string,
  ...binds: unknown[]
): Promise<void> {
  await env.DB.prepare(sql).bind(...binds).run()
}

async function one<T>(sql: string, ...binds: unknown[]): Promise<T> {
  const row = await env.DB.prepare(sql).bind(...binds).first<T>()
  if (row === null) throw new Error(`seed query returned no row: ${sql}`)
  return row
}

interface SeedEntryOpts {
  documentId: string
  slug: string
  title: string
  summary?: string
  body?: string
  published: boolean
  updatedAt?: number
  spoilerDocId?: string
}


/** 清空考据域内容表（各 describe 使用相同 document_id，需先清再种） */
async function resetContentTables(): Promise<void> {
  const tables = [
    'entry_revisions',
    'entry_related_links',
    'entry_citations',
    'entry_themes',
    'entry_subjects',
    'subject_students',
    'path_steps',
    'research_paths',
    'research_citations',
    'research_entries',
    'research_themes',
    'research_subjects',
    'spoiler_tiers',
    'curator',
    'students',
    'creator_students',
    'representative_works',
    'creators',
  ]
  for (const table of tables) {
    await env.DB.prepare(`DELETE FROM ${table}`).run()
  }
}
async function seedEntry(opts: SeedEntryOpts): Promise<number> {
  let spoilerId: number | null = null
  if (opts.spoilerDocId !== undefined) {
    spoilerId = (await one<{ id: number }>(`SELECT id FROM spoiler_tiers WHERE document_id = ?1`, opts.spoilerDocId)).id
  }
  const updatedAt = opts.updatedAt ?? NOW
  await insert(
    `INSERT INTO research_entries
       (document_id, slug, title_json, summary_json, body_json, stance, media_type,
        spoiler_tier_id, created_at, updated_at, published_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 'official', 'text', ?6, ?7, ?8, ?9)`,
    opts.documentId,
    opts.slug,
    JSON.stringify({ 'zh-Hans': opts.title }),
    opts.summary === undefined ? null : JSON.stringify({ 'zh-Hans': opts.summary }),
    opts.body === undefined ? null : JSON.stringify({ 'zh-Hans': opts.body }),
    spoilerId,
    updatedAt,
    updatedAt,
    opts.published ? updatedAt : null
  )
  return (await one<{ id: number }>(`SELECT id FROM research_entries WHERE document_id = ?1`, opts.documentId)).id
}

async function seedSpoilerTier(): Promise<void> {
  await insert(
    `INSERT INTO spoiler_tiers (document_id, key, title_json, sort_order) VALUES (?, ?, ?, ?)`,
    'spoiler-doc-1',
    'pre-story',
    '{"zh-Hans":"主线前","en":"Pre-story"}',
    0
  )
}

async function seedStudent(): Promise<void> {
  await insert(
    `INSERT INTO students (document_id, slug, name, created_at, updated_at, published_at)
     VALUES ('stu-doc-1', 'shiroko', 'シロコ', ?1, ?1, ?1)`,
    NOW
  )
}

describe('GET /research-entries — 列表 populate 完整性与 locale 回退', () => {
  it('populates themes/subjects/spoiler_tier, hides drafts, paginates', async () => {
    await seedSpoilerTier()
    await insert(
      `INSERT INTO research_themes (document_id, slug, title_json, created_at, updated_at, published_at)
       VALUES ('theme-doc-1', 'a-bydos', '{"zh-Hans":"阿拜多斯考据"}', ?1, ?1, ?1)`,
      NOW
    )
    await insert(
      `INSERT INTO research_subjects (document_id, slug, title_json, subject_type, created_at, updated_at, published_at)
       VALUES ('subj-doc-1', 'prefect-team', '{"zh-Hans":"风纪委员会"}', 'organization', ?1, ?1, ?1)`,
      NOW
    )

    const entryId = await seedEntry({
      documentId: 'entry-doc-1',
      slug: 'bydos-debt',
      title: '阿拜多斯债务考',
      summary: '关于债务规模的分析',
      published: true,
      spoilerDocId: 'spoiler-doc-1',
    })
    await seedEntry({ documentId: 'entry-doc-draft', slug: 'draft-entry', title: '草稿条目', published: false })

    await insert(`INSERT INTO entry_themes (entry_id, theme_id) VALUES (?1, 1)`, entryId)
    await insert(`INSERT INTO entry_subjects (entry_id, subject_id) VALUES (?1, 1)`, entryId)

    const res = await req(
      '/research-entries?locale=zh-Hans&sort=updatedAt:desc&pagination[pageSize]=100&populate[themes]=true&populate[subjects]=true&populate[spoiler_tier]=true'
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: Array<{
        id: number
        documentId: string
        title: string
        themes: Array<{ slug: string; name: string }>
        subjects: Array<{ slug: string }>
        spoiler_tier: { key: string } | null
      }>
      meta: { pagination: { total: number } }
    }

    expect(body.data).toHaveLength(1)
    const entry = body.data[0]
    expect(entry.documentId).toBe('entry-doc-1')
    expect(typeof entry.id).toBe('number')
    expect(entry.title).toBe('阿拜多斯债务考')
    expect(entry.themes).toEqual([{ id: 1, documentId: 'theme-doc-1', name: '阿拜多斯考据', slug: 'a-bydos', createdAt: expect.any(String), updatedAt: expect.any(String), publishedAt: expect.any(String) }])
    expect(entry.subjects.map((s) => s.slug)).toEqual(['prefect-team'])
    expect(entry.spoiler_tier).not.toBeNull()
    expect(entry.spoiler_tier?.key).toBe('pre-story')
    expect(body.meta.pagination.total).toBe(1)

    // locale 回退：请求 ja，条目无 ja 翻译 → 回退 zh-Hans
    const resJa = await req('/research-entries?locale=ja')
    const bodyJa = (await resJa.json()) as { data: Array<{ title: string }> }
    expect(bodyJa.data[0].title).toBe('阿拜多斯债务考')
  })
})

describe('GET /research-entries/:slug — 详情与 populate', () => {
  it('returns full detail with citations/related_links/revisions; 404 for unknown and drafts', async () => {
    await seedEntry({ documentId: 'entry-doc-a', slug: 'target-entry', title: '目标条目', body: '正文内容', published: true })
    await seedEntry({ documentId: 'entry-doc-cited', slug: 'cited-entry', title: '被引条目', published: true })

    await insert(
      `INSERT INTO research_citations (document_id, claim_short_json, source_type, confidence, created_at, updated_at, published_at)
       VALUES ('cite-doc-1', '{"zh-Hans":"某活动剧情"}', 'game_event', 'high', ?1, ?1, ?1)`,
      NOW
    )
    const targetId = (await one<{ id: number }>(`SELECT id FROM research_entries WHERE slug = 'target-entry'`)).id
    await insert(`INSERT INTO entry_citations (entry_id, citation_id) VALUES (?1, 1)`, targetId)
    await insert(
      `INSERT INTO entry_related_links (entry_id, target_document_id, relation_type, sort_order)
       VALUES (?1, 'entry-doc-cited', 'extends', 0)`,
      targetId
    )
    await insert(
      `INSERT INTO entry_revisions (entry_id, revised_at, revision_type, sort_order) VALUES (?1, '2025-06-01', 'updated', 0)`,
      targetId
    )

    const res = await req('/research-entries/target-entry?locale=zh-Hans')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        slug: string
        body?: string
        citations: Array<{ claim_short: string; source_type: string }>
        related_links: Array<{ relation_type: string; target_entry?: { slug: string } }>
        revisions: Array<{ date: string; revision_type: string }>
      }
    }
    expect(body.data.slug).toBe('target-entry')
    expect(body.data.body).toBe('正文内容')
    expect(body.data.citations).toHaveLength(1)
    expect(body.data.citations[0].claim_short).toBe('某活动剧情')
    expect(body.data.related_links).toHaveLength(1)
    expect(body.data.related_links[0].relation_type).toBe('extends')
    expect(body.data.related_links[0].target_entry?.slug).toBe('cited-entry')
    expect(body.data.revisions).toHaveLength(1)
    expect(body.data.revisions[0].revision_type).toBe('updated')

    expect((await req('/research-entries/no-such-slug')).status).toBe(404)

    await seedEntry({ documentId: 'entry-doc-x', slug: 'ghost', title: 'x', published: false })
    expect((await req('/research-entries/ghost')).status).toBe(404)
  })
})

describe('GET /research-entries/:documentId/backlinks — 反向链接正确性', () => {
  it('unions structured edges and [[wiki]] links, excludes self and drafts', async () => {
    await seedEntry({ documentId: 'entry-target', slug: 'hub-entry', title: '枢纽条目', published: true, updatedAt: NOW })

    // 通过结构化边链接（updated 较早）
    await seedEntry({ documentId: 'entry-linker', slug: 'linker-entry', title: '边引用者', published: true, updatedAt: NOW + 200 })
    const linkerId = (await one<{ id: number }>(`SELECT id FROM research_entries WHERE slug = 'linker-entry'`)).id
    await insert(
      `INSERT INTO entry_related_links (entry_id, target_document_id, relation_type, sort_order)
       VALUES (?1, 'entry-target', 'prerequisite', 0)`,
      linkerId
    )

    // 通过正文 [[hub-entry]] 链接（updated 较晚）
    await seedEntry({
      documentId: 'entry-wikilink',
      slug: 'wikilink-entry',
      title: '文内链接者',
      body: '参见 [[hub-entry]] 的分析。',
      published: true,
      updatedAt: NOW + 300,
    })

    // 草稿引用者（不应出现：published 过滤）
    await seedEntry({
      documentId: 'entry-draft-linker',
      slug: 'draft-linker',
      title: '草稿引用者',
      body: '参见 [[hub-entry]]。',
      published: false,
    })

    const res = await req('/research-entries/entry-target/backlinks?locale=zh-Hans')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Array<{ slug: string }> }

    expect(body.data.map((e) => e.slug)).toEqual(['wikilink-entry', 'linker-entry'])
    expect((await req('/research-entries/nope/backlinks')).status).toBe(404)
  })
})

describe('GET /research-paths — steps 顺序与 neighbors 上下一篇', () => {
  it('orders steps by sort_order and computes prev/next neighbors', async () => {
    await seedEntry({ documentId: 'path-e1', slug: 'step-one', title: '第一篇', summary: '入门', published: true })
    await seedEntry({ documentId: 'path-e2', slug: 'step-two', title: '第二篇', published: true })
    await seedEntry({ documentId: 'path-e3', slug: 'step-three', title: '第三篇', published: true })

    await insert(
      `INSERT INTO research_paths (document_id, slug, title_json, difficulty, sort_order, created_at, updated_at, published_at)
       VALUES ('path-doc-1', 'bydos-line', '{"zh-Hans":"阿拜多斯主线"}', 'beginner', 1, ?1, ?1, ?1)`,
      NOW
    )
    // 故意乱序插入，验证按 sort_order 输出
    const steps: Array<[string, string, number]> = [
      ['path-e3', '{"zh-Hans":"step-note-3"}', 30],
      ['path-e1', '{"zh-Hans":"step-note-1"}', 10],
      ['path-e2', '{"zh-Hans":"step-note-2"}', 20],
    ]
    for (const [docId, note, order] of steps) {
      await insert(
        `INSERT INTO path_steps (path_id, target_document_id, step_note_json, sort_order) VALUES (1, ?1, ?2, ?3)`,
        docId,
        note,
        order
      )
    }

    // 列表：steps 按 sort_order 且带最小 entry 字段
    const listRes = await req('/research-paths?sort[0]=order:asc&pagination[pageSize]=50')
    const listBody = (await listRes.json()) as {
      data: Array<{
        slug: string
        order: number
        steps: Array<{ entry?: { slug: string; title: string; summary?: string }; step_note?: string }>
      }>
    }
    const path = listBody.data.find((p) => p.slug === 'bydos-line')
    expect(path).toBeDefined()
    expect(path!.steps.map((s) => s.entry?.slug)).toEqual(['step-one', 'step-two', 'step-three'])
    expect(path!.steps[0].entry?.summary).toBe('入门')
    expect(path!.steps[0].step_note).toBe('step-note-1')

    // 单路径详情
    const detailRes = await req('/research-paths/bydos-line')
    expect(detailRes.status).toBe(200)
    const detail = (await detailRes.json()) as { data: { slug: string; steps: unknown[] } }
    expect(detail.data.steps).toHaveLength(3)

    // neighbors：中间元素
    const midRes = await req('/research-paths/bydos-line/neighbors/path-e2?locale=zh-Hans')
    expect(midRes.status).toBe(200)
    const mid = (await midRes.json()) as {
      data: { previous: { slug: string } | null; next: { slug: string } | null }
    }
    expect(mid.data.previous?.slug).toBe('step-one')
    expect(mid.data.next?.slug).toBe('step-three')

    // 首元素：previous 为 null
    const firstRes = await req('/research-paths/bydos-line/neighbors/path-e1')
    const first = (await firstRes.json()) as {
      data: { previous: unknown; next: { slug: string } | null }
    }
    expect(first.data.previous).toBeNull()
    expect(first.data.next?.slug).toBe('step-two')

    // 条目不在路径中 → 404
    expect((await req('/research-paths/bydos-line/neighbors/unknown-doc')).status).toBe(404)

    // filters[steps][entry][slug]：包含指定条目的路径
    const containingRes = await req('/research-paths?filters[steps][entry][slug][$eq]=step-two')
    const containing = (await containingRes.json()) as { data: Array<{ slug: string }> }
    expect(containing.data.map((p) => p.slug)).toEqual(['bydos-line'])
  })
})

describe('themes / subjects / also-cited / graph', () => {
  beforeEach(resetContentTables)

  it('lists and resolves themes by slug', async () => {
    await insert(
      `INSERT INTO research_themes (document_id, slug, title_json, curated_intro_json, created_at, updated_at, published_at)
       VALUES ('theme-doc-1', 'numbers', '{"zh-Hans":"数字考据"}', '{"zh-Hans":"关于数字的一切"}', ?1, ?1, ?1)`,
      NOW
    )

    const listRes = await req('/research-themes?locale=zh-Hans&sort=name:asc&pagination[pageSize]=100')
    const listBody = (await listRes.json()) as {
      data: Array<{ documentId: string; name: string; slug: string; curated_intro?: string }>
    }
    expect(listBody.data).toHaveLength(1)
    expect(listBody.data[0]).toMatchObject({ documentId: 'theme-doc-1', name: '数字考据', slug: 'numbers', curated_intro: '关于数字的一切' })

    const oneRes = await req('/research-themes/numbers')
    expect(oneRes.status).toBe(200)
    expect(((await oneRes.json()) as { data: { name: string } }).data.name).toBe('数字考据')
    expect((await req('/research-themes/nope')).status).toBe(404)
  })

  it('resolves subject detail with student card; filters subjects by student', async () => {
    await seedStudent()
    await insert(
      `INSERT INTO research_subjects (document_id, slug, title_json, description_json, subject_type, cover_url, created_at, updated_at, published_at)
       VALUES ('subj-doc-1', 'shiroko-files', '{"zh-Hans":"白子档案"}', '{"zh-Hans":"白子相关考据"}', 'student', '/covers/shiroko.webp', ?1, ?1, ?1)`,
      NOW
    )
    // 关联表用实际 id（reset 后 AUTOINCREMENT 序列跨 suite 不保证从 1 开始）
    const stuId = (await env.DB.prepare('SELECT id FROM students WHERE document_id = ?1').bind('stu-doc-1').first<{ id: number }>())!.id
    const subjId = (await env.DB.prepare('SELECT id FROM research_subjects WHERE document_id = ?1').bind('subj-doc-1').first<{ id: number }>())!.id
    await insert(`INSERT INTO subject_students (subject_id, student_id) VALUES (?1, ?2)`, subjId, stuId)

    const res = await req('/research-subjects/shiroko-files?locale=zh-Hans')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        name: string
        description?: string
        cover?: { url: string }
        students: Array<{ name: string; avatar: { url: string } | null }>
      }
    }
    expect(body.data.name).toBe('白子档案')
    expect(body.data.description).toBe('白子相关考据')
    expect(body.data.cover?.url).toBe('/covers/shiroko.webp')
    expect(body.data.students).toHaveLength(1)
    expect(body.data.students[0].name).toBe('シロコ')

    // 学生反查（$or students.id / students.documentId）+ entries 最小字段
    const e1 = await seedEntry({ documentId: 'subj-e1', slug: 'subj-entry-1', title: '对象条目一', published: true })
    await insert(`INSERT INTO entry_subjects (entry_id, subject_id) VALUES (?1, ?2)`, e1, subjId)

    const byStuRes = await req(
      `/research-subjects?locale=zh-Hans&filters[$or][0][students][id][$eq]=${stuId}&filters[$or][1][students][documentId][$eq]=stu-doc-1&populate[entries][fields][0]=title`
    )
    const byStu = (await byStuRes.json()) as {
      data: Array<{ slug: string; entries: Array<{ slug: string; title: string }> }>
    }
    expect(byStu.data).toHaveLength(1)
    expect(byStu.data[0].slug).toBe('shiroko-files')
    expect(byStu.data[0].entries[0]?.slug).toBe('subj-entry-1')
  })

  it('finds entries sharing a citation, excluding the current entry', async () => {
    await insert(
      `INSERT INTO research_citations (document_id, claim_short_json, created_at, updated_at, published_at)
       VALUES ('cite-shared', '{"zh-Hans":"共同引证"}', ?1, ?1, ?1)`,
      NOW
    )
    const a = await seedEntry({ documentId: 'cited-a', slug: 'cites-shared-a', title: '甲', published: true })
    const b = await seedEntry({ documentId: 'cited-b', slug: 'cites-shared-b', title: '乙', published: true })
    const citeId = (await env.DB.prepare('SELECT id FROM research_citations WHERE document_id = ?1').bind('cite-shared').first<{ id: number }>())!.id
    await insert(`INSERT INTO entry_citations (entry_id, citation_id) VALUES (?1, ?2)`, a, citeId)
    await insert(`INSERT INTO entry_citations (entry_id, citation_id) VALUES (?1, ?2)`, b, citeId)

    const res = await req(
      `/research-citations/cite-shared/also-cited?locale=zh-Hans&filters[slug][$ne]=cites-shared-a`
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Array<{ slug: string; citations: Array<{ id: number }> }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].citations).toContainEqual({ id: citeId })
    expect((await req('/research-citations/nope/also-cited')).status).toBe(404)
  })

  it('aggregates graph nodes with theme attributes and edges from related_links', async () => {
    await insert(
      `INSERT INTO research_themes (document_id, slug, title_json, created_at, updated_at, published_at)
       VALUES ('theme-doc-g', 'graph-theme', '{"zh-Hans":"图谱主题"}', ?1, ?1, ?1)`,
      NOW
    )
    await seedEntry({ documentId: 'graph-dst', slug: 'graph-target', title: '图谱目标', published: true })
    await seedEntry({ documentId: 'graph-src', slug: 'graph-source', title: '图谱源', body: '[[cites-shared-a]]', published: true })
    const srcId = (await one<{ id: number }>(`SELECT id FROM research_entries WHERE slug = 'graph-source'`)).id
    await insert(`INSERT INTO entry_themes (entry_id, theme_id) VALUES (?1, ?2)`, srcId, (await one<{ id: number }>(`SELECT id FROM research_themes WHERE slug = 'graph-theme'`)).id)
    await insert(
      `INSERT INTO entry_related_links (entry_id, target_document_id, relation_type, sort_order)
       VALUES (?1, 'graph-dst', 'echoes', 0)`,
      srcId
    )

    const res = await req('/research-graph?locale=zh-Hans')
    expect(res.status).toBe(200)
    const graph = (await res.json()) as {
      data: {
        nodes: Array<{ id: string; slug: string; themes: Array<{ slug: string }>; body?: string }>
        edges: Array<{ source: string; target: string; relation_type: string }>
      }
    }
    const node = graph.data.nodes.find((n) => n.slug === 'graph-source')
    expect(node).toBeDefined()
    expect(node!.themes.map((t) => t.slug)).toContain('graph-theme')
    expect(graph.data.edges).toContainEqual({ source: 'graph-src', target: 'graph-dst', relation_type: 'echoes' })
  })
})
