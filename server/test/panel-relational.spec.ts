/**
 * 面板的两类关联数据：
 * - joins：多对多连接表（entry_themes / entry_subjects / entry_citations / subject_students）
 * - children：有序子行表（entry_related_links / entry_revisions / path_steps）
 *
 * 通用 CRUD 此前两类都不支持，而前端编辑器一直在提交这些字段 ——
 * 被字段白名单判为未登记字段直接 400，整个考据域从后台一条都存不进去。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { applyMigration } from './helpers'
import { hashPassword } from '../src/auth/password'
import { createSession } from '../src/auth/session'
import app from '../src/index'

const ADMIN = { identifier: 'rel2-admin', password: 'rel2-pass-12345' }
let userId: number

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const token = await createSession(env.DB, userId)
  return app.request(
    `https://test.local/api${path}`,
    {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    },
    env
  )
}

async function seedTheme(slug: string): Promise<string> {
  const now = Date.now()
  const documentId = `th-${slug}`
  await env.DB.prepare(
    `INSERT INTO research_themes (document_id, slug, title_json, created_at, updated_at, published_at)
     VALUES (?1, ?2, ?3, ?4, ?4, ?4)`
  )
    .bind(documentId, slug, JSON.stringify({ 'zh-Hans': slug }), now)
    .run()
  return documentId
}

async function seedCitation(ref: string): Promise<string> {
  const now = Date.now()
  const documentId = `ci-${ref}`
  await env.DB.prepare(
    `INSERT INTO research_citations (document_id, source_ref, created_at, updated_at, published_at)
     VALUES (?1, ?2, ?3, ?3, ?3)`
  )
    .bind(documentId, ref, now)
    .run()
  return documentId
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
  await applyMigration(env.DB, 'migrations/0004_citation_source_image.sql')

  const passwordHash = await hashPassword(ADMIN.password)
  await env.DB.prepare(
    "INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, 'rel2@example.com', ?2, 'maintainer', 0, 1, ?3)"
  )
    .bind(ADMIN.identifier, passwordHash, Date.now())
    .run()
  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?1')
    .bind(ADMIN.identifier)
    .first<{ id: number }>()
  userId = user!.id
})

beforeEach(async () => {
  for (const table of [
    'entry_themes',
    'entry_subjects',
    'entry_citations',
    'entry_related_links',
    'entry_revisions',
    'path_steps',
    'research_entries',
    'research_themes',
    'research_citations',
    'research_paths',
  ]) {
    await env.DB.prepare(`DELETE FROM ${table}`).run()
  }
})

describe('考据条目可以保存（此前整域 400）', () => {
  it('提交编辑器的完整字段集不再被拒', async () => {
    const res = await authed('/panel/research-entries', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          title: '测试条目',
          slug: 'ce-shi-tiao-mu',
          summary: '摘要',
          body: '正文',
          stance: 'official',
          mediaType: 'text',
          themes: [],
          subjects: [],
          citations: [],
          related_links: [],
          revisions: [],
          publishedAt: false,
        },
      }),
    })
    expect(res.status).toBe(200)
  })
})

describe('多对多关联（joins）', () => {
  it('用 documentId 写入并读回', async () => {
    const a = await seedTheme('alpha')
    const b = await seedTheme('beta')

    const created = (await (
      await authed('/panel/research-entries', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '条目', slug: 'tiao-mu', themes: [a, b] } }),
      })
    ).json()) as { data: { documentId: string; themes: string[] } }

    expect(created.data.themes.sort()).toEqual([a, b].sort())

    const got = (await (await authed(`/panel/research-entries/${created.data.documentId}`)).json()) as {
      data: { themes: string[] }
    }
    expect(got.data.themes.sort()).toEqual([a, b].sort())
  })

  it('更新为整体替换：取消勾选的关联会被真正移除', async () => {
    const a = await seedTheme('keep')
    const b = await seedTheme('drop')
    const created = (await (
      await authed('/panel/research-entries', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '条目', slug: 'ti', themes: [a, b] } }),
      })
    ).json()) as { data: { documentId: string } }

    const updated = (await (
      await authed(`/panel/research-entries/${created.data.documentId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: { themes: [a] } }),
      })
    ).json()) as { data: { themes: string[] } }
    expect(updated.data.themes).toEqual([a])

    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM entry_themes').first<{ n: number }>()
    expect(rows!.n).toBe(1)
  })

  it('清空关联', async () => {
    const a = await seedTheme('solo')
    const created = (await (
      await authed('/panel/research-entries', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '条目', slug: 'tj', themes: [a] } }),
      })
    ).json()) as { data: { documentId: string } }

    const cleared = (await (
      await authed(`/panel/research-entries/${created.data.documentId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: { themes: [] } }),
      })
    ).json()) as { data: { themes: string[] } }
    expect(cleared.data.themes).toEqual([])
  })

  it('指向不存在的关联对象 → 400，且不留下半截数据', async () => {
    const res = await authed('/panel/research-entries', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '条目', slug: 'bad', themes: ['th-does-not-exist'] } }),
    })
    expect(res.status).toBe(400)

    const links = await env.DB.prepare('SELECT COUNT(*) AS n FROM entry_themes').first<{ n: number }>()
    expect(links!.n).toBe(0)
  })

  it('不传该字段时保持原有关联不变', async () => {
    const a = await seedTheme('sticky')
    const created = (await (
      await authed('/panel/research-entries', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '条目', slug: 'sk', themes: [a] } }),
      })
    ).json()) as { data: { documentId: string } }

    await authed(`/panel/research-entries/${created.data.documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { title: '只改标题' } }),
    })

    const got = (await (await authed(`/panel/research-entries/${created.data.documentId}`)).json()) as {
      data: { themes: string[] }
    }
    expect(got.data.themes).toEqual([a])
  })

  it('引证关联同样可用', async () => {
    const c1 = await seedCitation('ref-1')
    const created = (await (
      await authed('/panel/research-entries', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '条目', slug: 'yz', citations: [c1] } }),
      })
    ).json()) as { data: { citations: string[] } }
    expect(created.data.citations).toEqual([c1])
  })
})

describe('有序子行（children）', () => {
  it('写入后按顺序读回，排序列按数组下标落值', async () => {
    const created = (await (
      await authed('/panel/research-entries', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            title: '条目',
            slug: 'zx',
            related_links: [
              { target_entry: 'doc-b', relation_type: 'extends', curate_note: '第二条' },
              { target_entry: 'doc-a', relation_type: 'related', curate_note: '第一条' },
            ],
          },
        }),
      })
    ).json()) as {
      data: { documentId: string; related_links: Array<{ target_entry: string; curate_note: string }> }
    }

    // 保持提交顺序，不按字典序重排
    expect(created.data.related_links.map((r) => r.target_entry)).toEqual(['doc-b', 'doc-a'])
    expect(created.data.related_links[0]!.curate_note).toBe('第二条')

    const orders = await env.DB.prepare('SELECT sort_order FROM entry_related_links ORDER BY sort_order').all<{
      sort_order: number
    }>()
    expect(orders.results.map((r) => r.sort_order)).toEqual([0, 1])
  })

  it('更新为整体替换：删掉的行不会残留', async () => {
    const created = (await (
      await authed('/panel/research-entries', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            title: '条目',
            slug: 'th',
            revisions: [
              { date: '2026-01-01', revision_type: 'created', note: 'a' },
              { date: '2026-02-01', revision_type: 'updated', note: 'b' },
            ],
          },
        }),
      })
    ).json()) as { data: { documentId: string } }

    const updated = (await (
      await authed(`/panel/research-entries/${created.data.documentId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: { revisions: [{ date: '2026-03-01', revision_type: 'updated', note: 'c' }] } }),
      })
    ).json()) as { data: { revisions: Array<{ note: string }> } }

    expect(updated.data.revisions.length).toBe(1)
    expect(updated.data.revisions[0]!.note).toBe('c')

    const left = await env.DB.prepare('SELECT COUNT(*) AS n FROM entry_revisions').first<{ n: number }>()
    expect(left!.n).toBe(1)
  })

  it('空数组即清空全部子行', async () => {
    const created = (await (
      await authed('/panel/research-entries', {
        method: 'POST',
        body: JSON.stringify({
          data: { title: '条目', slug: 'kq', related_links: [{ target_entry: 'x', relation_type: 'related' }] },
        }),
      })
    ).json()) as { data: { documentId: string } }

    await authed(`/panel/research-entries/${created.data.documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { related_links: [] } }),
    })

    const left = await env.DB.prepare('SELECT COUNT(*) AS n FROM entry_related_links').first<{ n: number }>()
    expect(left!.n).toBe(0)
  })

  it('阅读路径的步骤同样可用', async () => {
    const created = (await (
      await authed('/panel/research-paths', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            title: '路径',
            slug: 'lu-jing',
            steps: [
              { target_entry: 'e1', step_note: '先读这个' },
              { target_entry: 'e2', step_note: '再读这个' },
            ],
          },
        }),
      })
    ).json()) as { data: { steps: Array<{ target_entry: string; step_note: string }> } }

    expect(created.data.steps.map((s) => s.target_entry)).toEqual(['e1', 'e2'])
    expect(created.data.steps[0]!.step_note).toBe('先读这个')
  })

  it('删除父行时子行随外键级联清理', async () => {
    const created = (await (
      await authed('/panel/research-entries', {
        method: 'POST',
        body: JSON.stringify({
          data: { title: '条目', slug: 'jl', related_links: [{ target_entry: 'x', relation_type: 'related' }] },
        }),
      })
    ).json()) as { data: { documentId: string } }

    await authed(`/panel/research-entries/${created.data.documentId}`, { method: 'DELETE' })

    const left = await env.DB.prepare('SELECT COUNT(*) AS n FROM entry_related_links').first<{ n: number }>()
    expect(left!.n).toBe(0)
  })
})

describe('列表不加载关联数据（避免 N+1）', () => {
  it('列表项不含 joins / children 字段', async () => {
    const a = await seedTheme('list-theme')
    await authed('/panel/research-entries', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '条目', slug: 'lb', themes: [a] } }),
    })

    const list = (await (await authed('/panel/research-entries?page=1&pageSize=10&status=all')).json()) as {
      data: Array<Record<string, unknown>>
    }
    expect(list.data.length).toBe(1)
    expect(list.data[0]!.themes).toBeUndefined()
  })
})
